import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck, X, RefreshCw, CheckCircle2, Circle, Clock, WalletCards } from "lucide-react";
import { Button } from "animal-island-ui";
import { BookingCalendar } from "../BookingCalendar";
import { useFetch } from "../../hooks/useFetch";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import { StatusBadge } from "./StatusBadge";
import { useToast } from "../shared/Toast";
import { publicMutationHeaders } from "../../lib/admin-helpers";
import { getApiError, readJsonResponse } from "../../lib/http";
import { getBusinessDate, isBookableBusinessDate } from "../../utils/businessDate";
import type { Booking } from "../../types/dashboard";

const timelineSteps = [
  { key: "pending", icon: Clock },
  { key: "contacted", icon: Circle },
  { key: "done", icon: CheckCircle2 },
] as const;

function getStepIndex(status: string): number {
  if (status === "canceled" || status === "cancelled") return -1;
  return timelineSteps.findIndex((s) => s.key === status);
}

function canManageBooking(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

function isCancelledBooking(status: string): boolean {
  return status === "canceled" || status === "cancelled";
}

type StatusHelpKey =
  | "dashboard.statusHelp.cancelled"
  | "dashboard.statusHelp.done"
  | "dashboard.statusHelp.confirmed"
  | "dashboard.statusHelp.pending";

function getStatusHelpKey(status: string): StatusHelpKey {
  if (isCancelledBooking(status)) return "dashboard.statusHelp.cancelled";
  if (status === "done") return "dashboard.statusHelp.done";
  if (status === "contacted" || status === "confirmed") return "dashboard.statusHelp.confirmed";
  return "dashboard.statusHelp.pending";
}

function formatPaymentAmount(amountCents: number | null, currency: string | null): string | null {
  if (amountCents == null || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / (currency.toLowerCase() === "jpy" ? 1 : 100));
  } catch {
    return `${amountCents / 100} ${currency.toUpperCase()}`;
  }
}

function BookingTimeline({ status }: { status: string }) {
  const { t } = useTranslation();
  const currentStep = getStepIndex(status);
  const isCancelled = currentStep === -1;

  if (isCancelled) {
    return (
      <div className="booking-timeline booking-timeline--cancelled">
        <div className="booking-timeline-step is-cancelled">
          <X size={14} />
          <span>{t("dashboard.status.cancelled")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-timeline">
      {timelineSteps.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        return (
          <div
            key={step.key}
            className={`booking-timeline-step${isCompleted ? " is-completed" : ""}${isCurrent ? " is-current" : ""}`}
          >
            <div className="booking-timeline-icon">
              {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
            </div>
            <div className="booking-timeline-info">
              <span className="booking-timeline-label">
                {t(`dashboard.status.${step.key}`)}
              </span>
            </div>
            {idx < timelineSteps.length - 1 && (
              <div className={`booking-timeline-connector${isCompleted ? " is-completed" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BookingsTab() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data, loading, error, retry } = useFetch<{ bookings: Booking[] }>("/api/user/bookings");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [actionError, setActionError] = useState<{ bookingId: string; message: string } | null>(null);
  const [earliestBookingDate] = useState(() => getBusinessDate());

  const handleCancel = useCallback(async (bookingId: string) => {
    setCancelLoading(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
      });
      const body = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiError(body, t("dashboard.cancelError")));
      }
      setConfirmCancelId(null);
      showToast(t("dashboard.cancelSuccess"), "success");
      retry();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("dashboard.cancelError");
      setActionError({ bookingId, message });
      showToast(message, "error");
    } finally {
      setCancelLoading(false);
    }
  }, [retry, showToast, t]);

  const handleReschedule = useCallback(async (bookingId: string) => {
    if (!newDate) return;
    if (!isBookableBusinessDate(newDate, earliestBookingDate)) {
      const message = t("dashboard.rescheduleDatePast", { date: earliestBookingDate });
      setActionError({ bookingId, message });
      showToast(message, "error");
      return;
    }

    setRescheduleLoading(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
        body: JSON.stringify({ preferred_date: newDate }),
      });
      const body = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiError(body, t("dashboard.rescheduleError")));
      }
      setRescheduleId(null);
      setNewDate("");
      showToast(t("dashboard.rescheduleSuccess", { date: newDate }), "success");
      retry();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("dashboard.rescheduleError");
      setActionError({ bookingId, message });
      showToast(message, "error");
    } finally {
      setRescheduleLoading(false);
    }
  }, [earliestBookingDate, newDate, retry, showToast, t]);

  const bookings = data?.bookings ?? [];
  const activeCount = bookings.filter((booking) => canManageBooking(booking.status)).length;
  const completedCount = bookings.filter((booking) => booking.status === "done").length;
  const cancelledCount = bookings.filter((booking) => isCancelledBooking(booking.status)).length;

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={bookings.length === 0}
      emptyIcon={<CalendarCheck size={40} strokeWidth={1.2} />}
      emptyTitle={t("dashboard.emptyStates.bookings.title")}
      emptyText={t("dashboard.emptyStates.bookings.description")}
      emptyAction={{ href: "/booking", label: t("dashboard.emptyStates.bookings.action") }}
      retry={retry}
    >
      <div className="dashboard-booking-overview" aria-live="polite">
        <div className="dashboard-booking-summary-card dashboard-booking-summary-card--active">
          <span>{t("dashboard.bookingOverview.active")}</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="dashboard-booking-summary-card">
          <span>{t("dashboard.bookingOverview.completed")}</span>
          <strong>{completedCount}</strong>
        </div>
        <div className="dashboard-booking-summary-card">
          <span>{t("dashboard.bookingOverview.cancelled")}</span>
          <strong>{cancelledCount}</strong>
        </div>
      </div>
      <div className="dashboard-list">
        {bookings.map((b) => {
          const canManage = canManageBooking(b.status);
          const paymentStatus = b.payment_status || "not_started";
          const paymentAmount = formatPaymentAmount(b.payment_amount_cents, b.payment_currency);
          return (
            <div key={b.id} className="dashboard-card">
              <div className="dashboard-card-header">
                <h4>{b.package_name}</h4>
                <StatusBadge status={b.status} />
              </div>
              <div className="dashboard-booking-schedule">
                <div className="dashboard-booking-schedule-item">
                  <span className="dashboard-booking-label">{t("dashboard.scheduledFor")}</span>
                  <strong>
                    {[b.preferred_date, b.preferred_time].filter(Boolean).join(" · ") || t("common.na", "N/A")}
                  </strong>
                </div>
                <div className="dashboard-booking-schedule-item">
                  <span className="dashboard-booking-label">{t("dashboard.requestedOn")}</span>
                  <strong>{new Date(b.created_at).toLocaleDateString()}</strong>
                </div>
              </div>
              <p className="dashboard-status-insight">
                {t(getStatusHelpKey(b.status))}
              </p>
              <div className={`dashboard-booking-deposit dashboard-booking-deposit--${paymentStatus}`}>
                <span className="dashboard-booking-deposit-icon" aria-hidden="true">
                  <WalletCards size={17} />
                </span>
                <span className="dashboard-booking-deposit-copy">
                  <span>{t("dashboard.bookingDeposit")}</span>
                  <strong>{t(`dashboard.paymentStatus.${paymentStatus}`)}</strong>
                </span>
                {paymentAmount && <span className="dashboard-booking-deposit-amount">{paymentAmount}</span>}
              </div>
              <BookingTimeline status={b.status} />
              <div className="dashboard-card-action-region" aria-live="polite">
                {canManage && (
                  <div className="dashboard-actions">
                    <button
                      type="button"
                      className="dashboard-action-btn dashboard-action-btn--cancel"
                      onClick={() => {
                        setConfirmCancelId(b.id);
                        setRescheduleId(null);
                        setNewDate("");
                        setActionError(null);
                      }}
                    >
                      <X size={12} />
                      {t("dashboard.cancelBooking")}
                    </button>
                    <button
                      type="button"
                      className="dashboard-action-btn dashboard-action-btn--reschedule"
                      onClick={() => {
                        const nextId = rescheduleId === b.id ? null : b.id;
                        setRescheduleId(nextId);
                        setConfirmCancelId(null);
                        setNewDate("");
                        setActionError(null);
                      }}
                    >
                      <RefreshCw size={12} />
                      {t("dashboard.rescheduleBooking")}
                    </button>
                  </div>
                )}
                {confirmCancelId === b.id && (
                  <div className="dashboard-confirm-panel dashboard-confirm-panel--danger" aria-busy={cancelLoading}>
                    <p className="dashboard-confirm-text">
                      {t("dashboard.confirmCancel")}
                    </p>
                    <div className="dashboard-confirm-actions">
                      <Button
                        type="primary"
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelLoading}
                        style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                      >
                        {cancelLoading ? t("common.loading") : t("dashboard.yesCancel")}
                      </Button>
                      <Button
                        type="default"
                        onClick={() => setConfirmCancelId(null)}
                        style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                      >
                        {t("dashboard.noKeep")}
                      </Button>
                    </div>
                  </div>
                )}
                {actionError?.bookingId === b.id && (
                  <p className="dashboard-action-error" role="alert">{actionError.message}</p>
                )}
                {rescheduleId === b.id && (
                  <div className="dashboard-confirm-panel dashboard-confirm-panel--default" aria-busy={rescheduleLoading}>
                    <p className="dashboard-reschedule-label">
                      {t("dashboard.selectNewDate")}
                    </p>
                    <p className="dashboard-reschedule-hint">
                      {t("dashboard.rescheduleHint")}
                    </p>
                    <BookingCalendar
                      selectedDate={newDate}
                      minDate={earliestBookingDate}
                      onSelectDate={setNewDate}
                    />
                    <div className="dashboard-reschedule-actions">
                      <Button
                        type="default"
                        onClick={() => {
                          setRescheduleId(null);
                          setNewDate("");
                        }}
                      >
                        {t("dashboard.closeReschedule")}
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => handleReschedule(b.id)}
                        disabled={!newDate || newDate === b.preferred_date || rescheduleLoading}
                      >
                        {rescheduleLoading ? t("common.loading") : t("dashboard.confirmReschedule")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardTabWrapper>
  );
}
