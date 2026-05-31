import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "animal-island-ui";
import { CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { PaymentFormProps, PaymentIntentStatus } from "../types/payment";
import { publicMutationHeaders } from "../lib/admin-helpers";

type InternalStatus = "idle" | "creating" | "confirming" | "succeeded" | "failed" | "cancelled";

export function PaymentForm({
  purpose,
  amountCents,
  currency = "usd",
  referenceId,
  metadata,
  onSuccess,
  onError,
  onCancel,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<InternalStatus>("idle");
  const [error, setError] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");

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

  const handleCreateIntent = async () => {
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
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || t("payment.createFailed", "Failed to initialize payment"));
      }

      const data = await r.json() as {
        paymentIntentId: string;
        clientSecret: string;
      };

      setPaymentIntentId(data.paymentIntentId);
      setStatus("confirming");
      await simulateConfirmation(data.paymentIntentId, data.clientSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("payment.error", "Payment failed");
      setError(msg);
      setStatus("failed");
      onError?.(msg);
    }
  };

  const simulateConfirmation = async (intentId: string, clientSecret: string) => {
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

      const data = await r.json() as { status: PaymentIntentStatus };

      if (data.status === "succeeded") {
        setStatus("succeeded");
        onSuccess?.(intentId);
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
  };

  if (status === "succeeded") {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <CheckCircle size={48} style={{ color: "#22c55e", marginBottom: 12 }} />
        <h3 style={{ marginBottom: 8 }}>{t("payment.success", "Payment Successful")}</h3>
        <p style={{ color: "var(--caramel-muted)", fontSize: "0.9rem" }}>
          {t("payment.successDesc", "Your payment has been processed successfully.")}
        </p>
      </div>
    );
  }

  if (status === "failed" || status === "cancelled") {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <AlertCircle size={48} style={{ color: "#ef4444", marginBottom: 12 }} />
        <h3 style={{ marginBottom: 8 }}>{t("payment.failed", "Payment Failed")}</h3>
        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: 16 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Button type="default" onClick={onCancel}>{t("payment.cancel", "Cancel")}</Button>
          <Button type="primary" onClick={handleCreateIntent}>{t("payment.retry", "Try Again")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <div style={{
        background: "var(--card-bg, rgba(255,255,255,0.7))",
        border: "1px solid var(--border-subtle)",
        borderRadius: 16,
        padding: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <CreditCard size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{t("payment.title", "Payment")}</h3>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.85rem", color: "var(--caramel-muted)", marginBottom: 4 }}>
            {purposeLabels[purpose] || purpose}
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
            {formatAmount(amountCents, currency)}
          </div>
        </div>

        <div className="booking-field">
          <label htmlFor="payment-card">{t("payment.cardLabel", "Card Number")}</label>
          <Input
            id="payment-card"
            placeholder="4242 4242 4242 4242"
            disabled
            shadow
          />
        </div>

        <div className="booking-row">
          <div className="booking-field">
            <label htmlFor="payment-expiry">{t("payment.expiryLabel", "Expiry")}</label>
            <Input
              id="payment-expiry"
              placeholder="MM/YY"
              disabled
              shadow
            />
          </div>
          <div className="booking-field">
            <label htmlFor="payment-cvc">{t("payment.cvcLabel", "CVC")}</label>
            <Input
              id="payment-cvc"
              placeholder="123"
              disabled
              shadow
            />
          </div>
        </div>

        <p style={{
          fontSize: "0.8rem",
          color: "var(--caramel-muted)",
          textAlign: "center",
          margin: "12px 0",
          lineHeight: 1.5,
        }}>
          {t("payment.placeholderNotice", "Payment processing is in placeholder mode. No real charges will be made.")}
        </p>

        {error && <p className="booking-error" role="alert">{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button type="default" onClick={onCancel} disabled={status === "creating" || status === "confirming"}>
            {t("payment.cancel", "Cancel")}
          </Button>
          <Button
            type="primary"
            onClick={handleCreateIntent}
            disabled={status === "creating" || status === "confirming"}
            style={{ flex: 1 }}
          >
            {status === "creating" || status === "confirming" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                {status === "creating" ? t("payment.initializing", "Initializing...") : t("payment.processing", "Processing...")}
              </span>
            ) : (
              t("payment.pay", "Pay {{amount}}", { amount: formatAmount(amountCents, currency) })
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
