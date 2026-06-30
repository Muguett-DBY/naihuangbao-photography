import { describe, expect, it } from "vitest";
import {
  BOOKING_CAPACITY_PER_DAY,
  getBookingTimeSlotAvailability,
  isBookingDateFull,
  isBookingTimeUnavailable,
  isCancelledBookingStatus,
  validateBookingTimeSlot,
  validateBookingDate,
} from "./_booking";

describe("booking domain rules", () => {
  it("accepts real booking dates that are today or later", () => {
    expect(validateBookingDate("2026-06-26", "2026-06-26")).toEqual({ valid: true });
    expect(validateBookingDate("2026-07-01", "2026-06-26")).toEqual({ valid: true });
  });

  it("rejects malformed, impossible, and past booking dates", () => {
    expect(validateBookingDate("06/27/2026", "2026-06-26")).toEqual({
      valid: false,
      error: "新的预约日期格式应为 YYYY-MM-DD",
    });
    expect(validateBookingDate("2026-02-31", "2026-01-01")).toEqual({
      valid: false,
      error: "新的预约日期不是有效日期",
    });
    expect(validateBookingDate("2026-06-25", "2026-06-26")).toEqual({
      valid: false,
      error: "新的预约日期不能早于今天",
    });
  });

  it("recognizes canonical and legacy cancelled statuses", () => {
    expect(isCancelledBookingStatus("cancelled")).toBe(true);
    expect(isCancelledBookingStatus("canceled")).toBe(true);
    expect(isCancelledBookingStatus("confirmed")).toBe(false);
  });

  it("marks a day full at the configured active-booking capacity", () => {
    expect(BOOKING_CAPACITY_PER_DAY).toBe(3);
    expect(isBookingDateFull(2)).toBe(false);
    expect(isBookingDateFull(3)).toBe(true);
  });

  it("derives bookable time windows from active bookings", () => {
    const slots = getBookingTimeSlotAvailability([
      { preferred_time: "morning" },
      { preferred_time: "afternoon" },
    ]);

    expect(slots.morning.status).toBe("booked");
    expect(slots.afternoon.status).toBe("booked");
    expect(slots.fullDay.status).toBe("booked");
  });

  it("treats a full-day booking as blocking every time window", () => {
    const slots = getBookingTimeSlotAvailability([{ preferred_time: "fullDay" }]);

    expect(slots.morning.status).toBe("booked");
    expect(slots.afternoon.status).toBe("booked");
    expect(slots.fullDay.status).toBe("booked");
    expect(isBookingTimeUnavailable([{ preferred_time: "fullDay" }], "morning")).toBe(true);
    expect(isBookingTimeUnavailable([{ preferred_time: "morning" }], "afternoon")).toBe(false);
  });

  it("validates known booking time slots while allowing flexible requests", () => {
    expect(validateBookingTimeSlot("")).toEqual({ valid: true });
    expect(validateBookingTimeSlot("afternoon")).toEqual({ valid: true });
    expect(validateBookingTimeSlot("evening")).toEqual({
      valid: false,
      error: "预约时段只能选择 morning、afternoon、fullDay 或留空",
    });
  });
});
