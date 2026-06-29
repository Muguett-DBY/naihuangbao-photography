import type { ValidationResult } from "./_validation";

export const BOOKING_CAPACITY_PER_DAY = 3;
export const BOOKING_TIME_ZONE = "Asia/Shanghai";
export const BOOKING_DATE_FORMAT = "YYYY-MM-DD";

export type BookingPolicy = {
  earliestDate: string;
  timeZone: string;
  capacityPerDay: number;
  dateFormat: string;
  unavailableReasons: {
    beforeEarliest: "before_earliest";
    fullyBooked: "fully_booked";
    invalidDate: "invalid_date";
  };
  generatedAt: string;
};

export function isCancelledBookingStatus(status: string) {
  return status === "cancelled" || status === "canceled";
}

export function isBookingDateFull(activeBookings: number) {
  return activeBookings >= BOOKING_CAPACITY_PER_DAY;
}

export function validateBookingDate(value: unknown, today: string): ValidationResult {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { valid: false, error: "新的预约日期格式应为 YYYY-MM-DD" };
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;

  if (!isRealDate) {
    return { valid: false, error: "新的预约日期不是有效日期" };
  }

  if (value < today) {
    return { valid: false, error: "新的预约日期不能早于今天" };
  }

  return { valid: true };
}

export function getBusinessDate(timeZone = BOOKING_TIME_ZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getBookingPolicy(now = new Date()): BookingPolicy {
  return {
    earliestDate: getBusinessDate(BOOKING_TIME_ZONE, now),
    timeZone: BOOKING_TIME_ZONE,
    capacityPerDay: BOOKING_CAPACITY_PER_DAY,
    dateFormat: BOOKING_DATE_FORMAT,
    unavailableReasons: {
      beforeEarliest: "before_earliest",
      fullyBooked: "fully_booked",
      invalidDate: "invalid_date",
    },
    generatedAt: now.toISOString(),
  };
}
