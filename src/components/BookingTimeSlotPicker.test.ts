import { describe, expect, it } from "vitest";
import { isBookingTimeSlotUnavailable } from "./BookingTimeSlotPicker";
import type { DateInfo } from "./BookingCalendar";

function dateInfo(overrides: Partial<DateInfo> = {}): DateInfo {
  return {
    status: "partial",
    count: 1,
    capacity: 3,
    remaining: 2,
    timeSlots: {
      morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
      afternoon: { status: "booked", count: 1, capacity: 1, remaining: 0 },
      fullDay: { status: "booked", count: 1, capacity: 1, remaining: 0 },
    },
    ...overrides,
  };
}

describe("BookingTimeSlotPicker availability", () => {
  it("releases the current full-day booking while rescheduling on the same date", () => {
    const availability = dateInfo();

    expect(isBookingTimeSlotUnavailable(availability, "morning")).toBe(true);
    expect(isBookingTimeSlotUnavailable(availability, "morning", "fullDay")).toBe(false);
    expect(isBookingTimeSlotUnavailable(availability, "afternoon", "fullDay")).toBe(false);
  });

  it("disables a flexible request when both half-day windows remain occupied", () => {
    const availability = dateInfo({
      count: 2,
      remaining: 1,
      timeSlots: {
        morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
        afternoon: { status: "booked", count: 1, capacity: 1, remaining: 0 },
        fullDay: { status: "booked", count: 2, capacity: 1, remaining: 0 },
      },
    });

    expect(isBookingTimeSlotUnavailable(availability, "")).toBe(true);
  });
});
