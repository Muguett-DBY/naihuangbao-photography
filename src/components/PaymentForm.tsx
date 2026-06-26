import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { CreditCard, CheckCircle, AlertCircle, Clock3, Loader2, RefreshCw, Shield } from "lucide-react";
import type { ConfirmPaymentResponse, CreatePaymentIntentResponse, PaymentFormProps } from "../types/payment";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { getApiError, readJsonResponse } from "../lib/http";

type InternalStatus = "idle" | "creating" | "confirming" | "pending" | "succeeded" | "failed" | "cancelled";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
type PaymentTrackStep = "request" | "review" | "followUp";

export function PaymentForm({
  purpose,
  amountCents,
  currency = "usd",
  referenceId,
  metadata,
  onSuccess,
  onPending,
  onError,
  onCancel,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<InternalStatus>("idle");
  const [error, setError] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [readiness, setReadiness] = useState<CreatePaymentIntentResponse["readiness"] | null>(null);

  const formatAmount = (cents: number, cur: string) => {
    const symbols: Record<string, string> = { usd: "$", eur: "\u20AC", gbp: "\u00A3", cny: "\u00A5", jpy: "\u00A5" };
    const sym = symbols[cur] || "$";
    const divisor = cur === "jpy" ? 1 : 100;
    return `${sym}${(cents / divisor).toFixed(divisor === 1 ? 0 : 2)}`;
  };

  const purposeLabels: Record<string, string> = {
    booking_deposit: t("payment.purpose.deposit", "Booking Deposit"),
    course_purchase: t("payment.purpose.course", "Course Purchase"),
    workshop_registration: t("payment.purpose.workshop", "Workshop Registration"),
    preset_purchase: t("payment.purpose.preset", "Preset Purchase"),
    merchandise_purchase: t("payment.purpose.merchandise", "Merchandise"),
  };

  const renderStatusTrack = (activeStep: PaymentTrackStep) => {
    const steps: Array<{ key: PaymentTrackStep; label: string }> = [
      { key: "request", label: t("payment.track.request", "Request") },
      { key: "review", label: t("payment.track.review", "Review") },
      { key: "followUp", label: t("payment.track.followUp", "Follow-up") },
    ];
    const activeIndex = steps.findIndex((step) => step.key === activeStep);

    return (
      <ol className="payment-status-track" aria-label={t("payment.statusTrackLabel", "Payment status")}>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`payment-status-step${index < activeIndex ? " is-done" : ""}${index === activeIndex ? " is-active" : ""}`}
          >
            <span className="payment-status-step-dot" aria-hidden="true">{index + 1}</span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    );
  };

  const simulateConfirmation = async (
    intentId: string,
    clientSecret: string,
    attempt = 0,
  ): Promise<"succeeded" | "pending" | "failed" | "cancelled"> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const r = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({ paymentIntentId: intentId, clientSecret }),
      });

      if (!r.ok) {
        throw new Error(t("payment.confirmFailed", "Could not verify payment"));
      }

      const data = await readJsonResponse<Partial<ConfirmPaymentResponse>>(r);

      if (data?.status === "succeeded") {
        return "succeeded";
      }

      if ((data?.status === "requires_confirmation" || data?.status === "processing") && attempt < MAX_RETRIES && data.nextAction === "confirm_payment") {
        setIsRetrying(true);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        setIsRetrying(false);
        return simulateConfirmation(intentId, clientSecret, attempt + 1);
      }

      if (data?.status === "failed" || data?.paymentStatus === "failed") return "failed";
      if (data?.status === "cancelled" || data?.paymentStatus === "cancelled") return "cancelled";
      return "pending";
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        setIsRetrying(true);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        setIsRetrying(false);
        return simulateConfirmation(intentId, clientSecret, attempt + 1);
      }
      throw err;
    }
  };

  const handleCreateIntent = useCallback(async () => {
    setStatus("creating");
    setError("");

    try {
      const r = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({
          purpose,
          amountCents,
          currency,
          referenceId,
          metadata,
        }),
      });

      if (!r.ok) {
        const data = await readJsonResponse(r);
        throw new Error(getApiError(data, t("payment.createFailed", "Failed to initialize payment")));
      }

      const data = await readJsonResponse<Partial<CreatePaymentIntentResponse>>(r);
      if (!data?.paymentIntentId || !data.clientSecret) {
        throw new Error(t("payment.createFailed", "Failed to initialize payment"));
      }

      setPaymentIntentId(data.paymentIntentId);
      setReadiness(data.readiness ?? null);
      const provider = data.provider;
      if (provider === "placeholder") {
        setStatus("pending");
        onPending?.(data.paymentIntentId);
        return;
      }

      setStatus("confirming");

      const outcome = await simulateConfirmation(data.paymentIntentId, data.clientSecret);
      if (outcome === "succeeded") {
        setStatus("succeeded");
        onSuccess?.(data.paymentIntentId);
      } else if (outcome === "pending") {
        setStatus("pending");
        onPending?.(data.paymentIntentId);
      } else if (outcome === "cancelled") {
        setStatus("cancelled");
        setError(t("payment.cancelledDesc", "Payment was cancelled. You can try again or continue without paying now."));
      } else {
        setStatus("failed");
        setError(t("payment.notCompleted", "Payment was not completed"));
        onError?.(t("payment.notCompleted", "Payment was not completed"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("payment.error", "Payment failed");
      setError(msg);
      setStatus("failed");
      onError?.(msg);
    }
  }, [purpose, amountCents, currency, referenceId, metadata, t, onSuccess, onPending, onError]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setError("");
    setTimeout(() => handleCreateIntent(), 100);
  }, [handleCreateIntent]);

  if (status === "succeeded") {
    return (
      <div className="payment-success">
        {renderStatusTrack("followUp")}
        <CheckCircle size={48} className="payment-success-icon" />
        <h3>{t("payment.success", "Payment Successful")}</h3>
        <p>{t("payment.successDesc", "Your payment has been processed successfully.")}</p>
        {paymentIntentId && (
          <p className="payment-transaction-id">
            {t("payment.transactionId", "Transaction ID")}: {paymentIntentId.slice(0, 16)}...
          </p>
        )}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="payment-pending" role="status">
        {renderStatusTrack("followUp")}
        <Clock3 size={48} className="payment-pending-icon" />
        <h3>{t("payment.pendingTitle", "Deposit status recorded")}</h3>
        <p>{t("payment.pendingDesc", "Your booking is saved. No charge was made, and the deposit remains pending.")}</p>
        <div className="payment-follow-up-note">
          <strong>{t("payment.followUpTitle", "Manual follow-up")}</strong>
          <span>{t("payment.pendingNextStep", "We will confirm payment options with you before any deposit is collected.")}</span>
        </div>
        {paymentIntentId && (
          <p className="payment-transaction-id">
            {t("payment.referenceId", "Reference ID")}: {paymentIntentId.slice(0, 16)}...
          </p>
        )}
        <Button type="primary" onClick={onCancel}>
          {t("payment.continueWithoutPaying", "Continue without paying now")}
        </Button>
      </div>
    );
  }

  if (status === "failed" || status === "cancelled") {
    return (
      <div className="payment-failed">
        {renderStatusTrack("review")}
        <AlertCircle size={48} className="payment-failed-icon" />
        <h3>{status === "cancelled" ? t("payment.cancelled", "Payment cancelled") : t("payment.failed", "Payment Failed")}</h3>
        {error && <p className="payment-error-msg">{error}</p>}
        <p className="payment-state-note">
          {status === "cancelled"
            ? t("payment.cancelledNextStep", "Your booking is still saved. You can continue without paying or try again.")
            : t("payment.failedNextStep", "No deposit was collected. You can retry or continue and we will follow up.")}
        </p>
        <div className="payment-failed-actions">
          <Button type="default" onClick={onCancel}>{t("payment.continueWithoutPaying", "Continue without paying now")}</Button>
          <Button type="primary" onClick={handleRetry}>
            <RefreshCw size={14} />
            {t("payment.retry", "Try Again")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-form-wrap">
      <div className="payment-form-card">
        <div className="payment-form-header">
          <CreditCard size={20} className="payment-form-icon" />
          <h3>{t("payment.title", "Payment")}</h3>
          <Shield size={14} className="payment-form-secure" />
        </div>

        {renderStatusTrack(status === "confirming" ? "review" : "request")}

        <div className="payment-form-amount">
          <div className="payment-form-purpose">
            {purposeLabels[purpose] || purpose}
          </div>
          <div className="payment-form-price">
            {formatAmount(amountCents, currency)}
          </div>
        </div>

        <div className="payment-placeholder-notice" role="note">
          <strong>{t("payment.readinessTitle", "Payment readiness")}</strong>
          <span>
            {!readiness || readiness.nextAction === "manual_follow_up"
              ? t("payment.placeholderNotice", "Payment processing is in placeholder mode. No real charges will be made.")
              : t("payment.providerReadyNotice", "Payment provider configuration is present. Continue to confirm payment.")}
          </span>
          {readiness?.missingConfiguration?.length ? (
            <small>
              {t("payment.missingConfiguration", "Missing configuration")}: {readiness.missingConfiguration.join(", ")}
            </small>
          ) : null}
        </div>

        {error && <p className="booking-error" role="alert">{error}</p>}

        {isRetrying && (
          <p className="payment-retrying">
            <Loader2 size={14} className="payment-spinner" />
            {t("payment.retrying", "Retrying payment confirmation...")}
          </p>
        )}

        <div className="payment-form-actions">
          <Button type="default" onClick={onCancel} disabled={status === "creating" || status === "confirming"}>
            {t("payment.payLater", "Pay later")}
          </Button>
          <Button
            type="primary"
            onClick={handleCreateIntent}
            disabled={status === "creating" || status === "confirming"}
            style={{ flex: 1 }}
          >
            {status === "creating" || status === "confirming" ? (
              <span className="payment-loading">
                <Loader2 size={14} className="payment-spinner" />
                {status === "creating" ? t("payment.initializing", "Initializing...") : t("payment.processing", "Processing...")}
              </span>
            ) : (
              t("payment.recordPending", "Record deposit as pending")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
