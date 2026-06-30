import { useTranslation } from "react-i18next";
import type { BookingTimeSlotKey, DateInfo } from "./BookingCalendar";

export const BOOKING_TIME_SLOT_KEYS: BookingTimeSlotKey[] = ["morning", "afternoon", "fullDay"];

function slotsConflict(currentSlot: string, candidateSlot: BookingTimeSlotKey) {
  return currentSlot === "fullDay" || candidateSlot === "fullDay" || currentSlot === candidateSlot;
}

function isSlotUnavailable(dateInfo: DateInfo | null, slot: BookingTimeSlotKey, releasedSlot?: string) {
  const slotInfo = dateInfo?.timeSlots?.[slot];
  if (!slotInfo) return false;

  const releaseCurrentBooking = Boolean(releasedSlot);
  const activeCount = Math.max((dateInfo?.count ?? 0) - (releaseCurrentBooking ? 1 : 0), 0);
  const dayFull = Boolean(dateInfo?.capacity && activeCount >= dateInfo.capacity);
  const releasedConflict = releasedSlot && slotsConflict(releasedSlot, slot) ? 1 : 0;
  const conflictingBookings = Math.max(slotInfo.count - releasedConflict, 0);
  return dayFull || conflictingBookings > 0;
}

export function isBookingTimeSlotUnavailable(dateInfo: DateInfo | null, value: string, releasedSlot?: string) {
  if (!value) {
    return isSlotUnavailable(dateInfo, "morning", releasedSlot)
      && isSlotUnavailable(dateInfo, "afternoon", releasedSlot);
  }
  if (!BOOKING_TIME_SLOT_KEYS.includes(value as BookingTimeSlotKey)) return true;
  return isSlotUnavailable(dateInfo, value as BookingTimeSlotKey, releasedSlot);
}

type BookingTimeSlotPickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  dateInfo: DateInfo | null;
  hint: string;
  optionalLabel?: string;
  error?: string;
  releasedSlot?: string;
};

export function BookingTimeSlotPicker({
  id,
  label,
  value,
  onChange,
  dateInfo,
  hint,
  optionalLabel,
  error,
  releasedSlot,
}: BookingTimeSlotPickerProps) {
  const { t } = useTranslation();
  const statusId = `${id}-slots`;
  const errorId = `${id}-error`;
  const flexibleUnavailable = isBookingTimeSlotUnavailable(dateInfo, "", releasedSlot);

  const options = BOOKING_TIME_SLOT_KEYS.map((slot) => {
    const unavailable = isSlotUnavailable(dateInfo, slot, releasedSlot);
    return {
      slot,
      unavailable,
      label: String(t(`bookingModal.${slot}` as never)),
      statusLabel: unavailable
        ? t("bookingModal.timeSlotUnavailable", "Unavailable")
        : t("bookingModal.timeSlotAvailable", "Available"),
    };
  });

  return (
    <div className="booking-field booking-time-slot-picker">
      <label htmlFor={id}>
        {label}
        {optionalLabel && <span className="booking-optional"> {optionalLabel}</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${statusId} ${errorId}` : statusId}
      >
        <option value="" disabled={flexibleUnavailable}>{t("bookingModal.any")}</option>
        {options.map((option) => (
          <option key={option.slot} value={option.slot} disabled={option.unavailable}>
            {option.label}
          </option>
        ))}
      </select>
      <div id={statusId} className="booking-time-slot-grid" role="list" aria-label={t("bookingModal.timeSlotStatusLabel", "Time availability")}>
        {options.map((option) => (
          <span
            key={option.slot}
            className={`booking-time-slot-pill${option.unavailable ? " is-unavailable" : " is-available"}`}
            role="listitem"
          >
            <span>{option.label}</span>
            <small>{option.statusLabel}</small>
          </span>
        ))}
      </div>
      <p className="booking-time-slot-hint">{hint}</p>
      {error && <span id={errorId} className="booking-field-error">{error}</span>}
    </div>
  );
}
