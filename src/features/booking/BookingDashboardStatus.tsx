import { CheckCircle2, Circle, Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const timelineSteps = [
  { key: "pending", icon: Clock },
  { key: "contacted", icon: Circle },
  { key: "done", icon: CheckCircle2 },
] as const;

type StatusHelpKey =
  | "dashboard.statusHelp.cancelled"
  | "dashboard.statusHelp.done"
  | "dashboard.statusHelp.confirmed"
  | "dashboard.statusHelp.pending";

export type TimeSlotRecovery = {
  canKeepDate?: boolean;
  requestedTime?: string;
  suggestedTime?: string;
  availableTimeSlots?: string[];
};

export type RescheduleRecoveryState = TimeSlotRecovery & {
  bookingId: string;
  preferredDate: string;
};

function getStepIndex(status: string): number {
  if (status === "canceled" || status === "cancelled") return -1;
  return timelineSteps.findIndex((step) => step.key === status);
}

export function canManageBooking(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

export function isCancelledBooking(status: string): boolean {
  return status === "canceled" || status === "cancelled";
}

export function getStatusHelpKey(status: string): StatusHelpKey {
  if (isCancelledBooking(status)) return "dashboard.statusHelp.cancelled";
  if (status === "done") return "dashboard.statusHelp.done";
  if (status === "contacted" || status === "confirmed") return "dashboard.statusHelp.confirmed";
  return "dashboard.statusHelp.pending";
}

export function formatPaymentAmount(amountCents: number | null, currency: string | null): string | null {
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

export function BookingTimeline({ status }: { status: string }) {
  const { t } = useTranslation();
  const currentStep = getStepIndex(status);

  if (currentStep === -1) {
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
      {timelineSteps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <div
            key={step.key}
            className={`booking-timeline-step${isCompleted ? " is-completed" : ""}${isCurrent ? " is-current" : ""}`}
          >
            <div className="booking-timeline-icon">
              {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
            </div>
            <div className="booking-timeline-info">
              <span className="booking-timeline-label">{t(`dashboard.status.${step.key}`)}</span>
            </div>
            {index < timelineSteps.length - 1 && (
              <div className={`booking-timeline-connector${isCompleted ? " is-completed" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
