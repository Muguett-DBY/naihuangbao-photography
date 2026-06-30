import type { ValidationResult } from "./_validation";

export const BOOKING_CAPACITY_PER_DAY = 3;
export const BOOKING_TIME_ZONE = "Asia/Shanghai";
export const BOOKING_DATE_FORMAT = "YYYY-MM-DD";
export const BOOKING_TIME_SLOTS = ["morning", "afternoon", "fullDay"] as const;

export type BookingTimeSlot = typeof BOOKING_TIME_SLOTS[number];
export type BookingTimeSlotStatus = "available" | "booked";
export type BookingTimeSlotInfo = {
  status: BookingTimeSlotStatus;
  count: number;
  capacity: number;
  remaining: number;
};
export type BookingTimeSlotRecovery = {
  canKeepDate: boolean;
  requestedTime: string;
  suggestedTime: BookingTimeSlot | "";
  availableTimeSlots: BookingTimeSlot[];
};

type BookingTimeRow = {
  preferred_time?: string | null;
};

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

export function isKnownBookingTimeSlot(value: string): value is BookingTimeSlot {
  return (BOOKING_TIME_SLOTS as readonly string[]).includes(value);
}

export function validateBookingTimeSlot(value: unknown): ValidationResult {
  if (value === undefined || value === null || value === "") return { valid: true };
  if (typeof value !== "string" || !isKnownBookingTimeSlot(value.trim())) {
    return { valid: false, error: "预约时段只能选择 morning、afternoon、fullDay 或留空" };
  }
  return { valid: true };
}

export function getBookingTimeSlotAvailability(rows: BookingTimeRow[], dayFull = false): Record<BookingTimeSlot, BookingTimeSlotInfo> {
  const morningCount = rows.filter((row) => row.preferred_time === "morning" || row.preferred_time === "fullDay").length;
  const afternoonCount = rows.filter((row) => row.preferred_time === "afternoon" || row.preferred_time === "fullDay").length;
  const fullDayConflictCount = rows.filter((row) => row.preferred_time === "morning" || row.preferred_time === "afternoon" || row.preferred_time === "fullDay").length;
  const buildSlot = (count: number): BookingTimeSlotInfo => {
    const booked = dayFull || count > 0;
    return {
      status: booked ? "booked" : "available",
      count,
      capacity: 1,
      remaining: booked ? 0 : 1,
    };
  };

  return {
    morning: buildSlot(morningCount),
    afternoon: buildSlot(afternoonCount),
    fullDay: buildSlot(fullDayConflictCount),
  };
}

export function isBookingTimeUnavailable(rows: BookingTimeRow[], preferredTime: string, dayFull = false) {
  if (dayFull) return true;

  const slots = getBookingTimeSlotAvailability(rows, dayFull);
  if (!preferredTime) {
    return slots.morning.status === "booked" && slots.afternoon.status === "booked";
  }
  if (!isKnownBookingTimeSlot(preferredTime)) return true;
  return slots[preferredTime].status === "booked";
}

export function getBookingTimeSlotRecovery(
  timeSlots: Record<BookingTimeSlot, BookingTimeSlotInfo>,
  requestedTime: string,
): BookingTimeSlotRecovery {
  const availableTimeSlots = BOOKING_TIME_SLOTS.filter((slot) => timeSlots[slot].status === "available");
  return {
    canKeepDate: availableTimeSlots.length > 0,
    requestedTime,
    suggestedTime: availableTimeSlots[0] ?? "",
    availableTimeSlots,
  };
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
