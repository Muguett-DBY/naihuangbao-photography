import { describe, expect, it } from "vitest";
import { onRequestGet as getBookingPolicy } from "./api/booking/policy";

describe("booking policy API", () => {
  it("returns the server-owned booking calendar policy", async () => {
    const response = await getBookingPolicy({
      request: new Request("https://shoot.custard.top/api/booking/policy"),
      env: {},
    } as never);
    const body = (await response.json()) as {
      earliestDate?: string;
      timeZone?: string;
      capacityPerDay?: number;
      dateFormat?: string;
      unavailableReasons?: Record<string, string>;
      generatedAt?: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.earliestDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.timeZone).toBe("Asia/Shanghai");
    expect(body.capacityPerDay).toBe(3);
    expect(body.dateFormat).toBe("YYYY-MM-DD");
    expect(body.unavailableReasons).toEqual({
      beforeEarliest: "before_earliest",
      fullyBooked: "fully_booked",
      invalidDate: "invalid_date",
    });
    expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
