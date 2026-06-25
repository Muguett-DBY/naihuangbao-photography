import { describe, expect, it } from "vitest";
import {
  BOOKING_CAPACITY_PER_DAY,
  isBookingDateFull,
  isCancelledBookingStatus,
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
});
