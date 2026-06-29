import { describe, expect, it } from "vitest";
import { getBusinessDate, isBookableBusinessDate, isRealDateKey } from "./businessDate";

describe("business date utilities", () => {
  it("uses the studio business timezone instead of the browser UTC date", () => {
    const lateUtcBeforeShanghaiMidnight = new Date("2026-06-29T16:30:00.000Z");

    expect(getBusinessDate(lateUtcBeforeShanghaiMidnight)).toBe("2026-06-30");
  });

  it("rejects impossible and past booking dates", () => {
    expect(isRealDateKey("2026-02-31")).toBe(false);
    expect(isRealDateKey("2026-06-30")).toBe(true);
    expect(isBookableBusinessDate("2026-06-29", "2026-06-30")).toBe(false);
    expect(isBookableBusinessDate("2026-06-30", "2026-06-30")).toBe(true);
  });
});
