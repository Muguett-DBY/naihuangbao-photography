import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck, X, RefreshCw, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "animal-island-ui";
import { useFetch } from "../../hooks/useFetch";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import { StatusBadge } from "./StatusBadge";
import { publicMutationHeaders } from "../../lib/admin-helpers";
import type { Booking } from "../../types/dashboard";

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const timelineSteps = [
  { key: "pending", icon: Clock },
  { key: "contacted", icon: Circle },
  { key: "done", icon: CheckCircle2 },
] as const;

function getStepIndex(status: string): number {
  if (status === "canceled" || status === "cancelled") return -1;
  return timelineSteps.findIndex((s) => s.key === status);
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
  const { data, loading, error, retry } = useFetch<{ bookings: Booking[] }>("/api/user/bookings");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancel = useCallback(async (bookingId: string) => {
    setCancelLoading(true);
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
      });
      if (response.ok) {
        setConfirmCancelId(null);
        retry();
      }
    } finally {
      setCancelLoading(false);
    }
  }, [retry]);

  const handleReschedule = useCallback(async (bookingId: string) => {
    if (!newDate) return;
    setRescheduleLoading(true);
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
        body: JSON.stringify({ preferred_date: newDate }),
      });
      if (response.ok) {
        setRescheduleId(null);
        setNewDate("");
        retry();
      }
    } finally {
      setRescheduleLoading(false);
    }
  }, [newDate, retry]);

  const bookings = data?.bookings ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={bookings.length === 0}
      emptyIcon={<CalendarCheck size={40} strokeWidth={1.2} />}
      emptyText={t("dashboard.noBookings")}
      retry={retry}
    >
      <div className="dashboard-list">
        {bookings.map((b) => {
          const canManage = b.status === "pending" || b.status === "confirmed";
          return (
            <div key={b.id} className="dashboard-card">
              <div className="dashboard-card-header">
                <h4>{b.package_name}</h4>
                <StatusBadge status={b.status} />
              </div>
              <div className="dashboard-card-meta">
                {b.preferred_date && <span>{b.preferred_date}</span>}
                {b.preferred_time && <span>{b.preferred_time}</span>}
              </div>
              <p className="dashboard-card-date">
                {new Date(b.created_at).toLocaleDateString()}
              </p>
              <BookingTimeline status={b.status} />
              {canManage && (
                <div className="dashboard-actions">
                  <button
                    type="button"
                    className="dashboard-action-btn dashboard-action-btn--cancel"
                    onClick={() => setConfirmCancelId(b.id)}
                  >
                    <X size={12} />
                    {t("dashboard.cancelBooking")}
                  </button>
                  <button
                    type="button"
                    className="dashboard-action-btn dashboard-action-btn--reschedule"
                    onClick={() => setRescheduleId(rescheduleId === b.id ? null : b.id)}
                  >
                    <RefreshCw size={12} />
                    {t("dashboard.rescheduleBooking")}
                  </button>
                </div>
              )}
              {confirmCancelId === b.id && (
                <div className="dashboard-confirm-panel dashboard-confirm-panel--danger">
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
              {rescheduleId === b.id && (
                <div className="dashboard-confirm-panel dashboard-confirm-panel--default">
                  <label className="dashboard-reschedule-label">
                    {t("dashboard.selectNewDate")}
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    min={getTodayString()}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="dashboard-reschedule-date"
                  />
                  <Button
                    type="primary"
                    onClick={() => handleReschedule(b.id)}
                    disabled={!newDate || rescheduleLoading}
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  >
                    {rescheduleLoading ? t("common.loading") : t("dashboard.confirmReschedule")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardTabWrapper>
  );
}
