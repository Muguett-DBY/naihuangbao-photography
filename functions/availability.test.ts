import { describe, expect, it, vi } from "vitest";
import { onRequestGet as getAvailability } from "./api/availability";

function createDb(results: Array<{ preferred_date: string; preferred_time: string }>) {
  const statement = {
    bind: vi.fn(() => statement),
    all: vi.fn(async () => ({ results })),
  };

  return {
    statement,
    prepare: vi.fn(() => statement),
  };
}

describe("availability API", () => {
  it("returns per-date capacity and remaining slot counts", async () => {
    const db = createDb([
      { preferred_date: "2099-08-20", preferred_time: "morning" },
      { preferred_date: "2099-08-20", preferred_time: "afternoon" },
      { preferred_date: "2099-08-21", preferred_time: "morning" },
      { preferred_date: "2099-08-21", preferred_time: "afternoon" },
      { preferred_date: "2099-08-21", preferred_time: "fullDay" },
    ]);
    const response = await getAvailability({
      request: new Request("https://shoot.custard.top/api/availability?month=2099-08"),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as {
      capacityPerDay?: number;
      dates?: Record<string, { status: string; count: number; capacity: number; remaining: number }>;
    };

    expect(response.status).toBe(200);
    expect(body.capacityPerDay).toBe(3);
    expect(body.dates?.["2099-08-20"]).toEqual({
      status: "partial",
      count: 2,
      capacity: 3,
      remaining: 1,
      timeSlots: {
        morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
        afternoon: { status: "booked", count: 1, capacity: 1, remaining: 0 },
        fullDay: { status: "booked", count: 2, capacity: 1, remaining: 0 },
      },
    });
    expect(body.dates?.["2099-08-21"]).toEqual({
      status: "booked",
      count: 3,
      capacity: 3,
      remaining: 0,
      timeSlots: {
        morning: { status: "booked", count: 2, capacity: 1, remaining: 0 },
        afternoon: { status: "booked", count: 2, capacity: 1, remaining: 0 },
        fullDay: { status: "booked", count: 3, capacity: 1, remaining: 0 },
      },
    });
  });

  it("reports time-slot availability for partially booked dates", async () => {
    const db = createDb([
      { preferred_date: "2099-08-20", preferred_time: "morning" },
    ]);
    const response = await getAvailability({
      request: new Request("https://shoot.custard.top/api/availability?month=2099-08"),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as {
      dates?: Record<string, { timeSlots?: Record<string, { status: string; remaining: number }> }>;
    };

    expect(response.status).toBe(200);
    expect(body.dates?.["2099-08-20"]?.timeSlots).toMatchObject({
      morning: { status: "booked", remaining: 0 },
      afternoon: { status: "available", remaining: 1 },
      fullDay: { status: "booked", remaining: 0 },
    });
  });
});
