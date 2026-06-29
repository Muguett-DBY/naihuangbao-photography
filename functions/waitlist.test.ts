import { describe, expect, it, vi } from "vitest";
import { onRequestPost as joinWaitlist } from "./api/booking/waitlist";

function createWaitlistDb(activeBookings: number, activeWaitlist = 0) {
  const writes: string[] = [];
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        all: vi.fn(async () => ({ results: [] })),
        first: vi.fn(async () => {
          if (sql.includes("from booking_requests")) return { count: activeBookings };
          if (sql.includes("from booking_waitlist")) return { c: activeWaitlist };
          return null;
        }),
        run: vi.fn(async () => {
          writes.push(sql);
          return { success: true };
        }),
      };
      return statement;
    }),
    writes,
  };
  return db;
}

function waitlistRequest(preferredDate = "2099-01-01") {
  return new Request("https://shoot.custard.top/api/booking/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nhb-public-action": "1",
    },
    body: JSON.stringify({
      preferredDate,
      contact: "guest@example.com",
      name: "Guest",
      packageName: "Portrait Session",
    }),
  });
}

describe("booking waitlist API", () => {
  it("rejects waitlist joins while a date still has direct booking capacity", async () => {
    const response = await joinWaitlist({
      request: waitlistRequest(),
      env: { DB: createWaitlistDb(2) },
    } as never);
    const body = (await response.json()) as {
      error?: string;
      policy?: { capacityPerDay?: number; activeBookings?: number; remaining?: number };
    };

    expect(response.status).toBe(409);
    expect(body.error).toBe("date_has_capacity");
    expect(body.policy).toMatchObject({
      capacityPerDay: 3,
      activeBookings: 2,
      remaining: 1,
    });
  });

  it("accepts waitlist joins only after the requested date is fully booked", async () => {
    const db = createWaitlistDb(3, 1);
    const response = await joinWaitlist({
      request: waitlistRequest(),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as {
      waitlist?: { preferredDate?: string; active?: boolean };
      policy?: { capacityPerDay?: number; activeBookings?: number };
    };

    expect(response.status).toBe(201);
    expect(body.waitlist).toMatchObject({ preferredDate: "2099-01-01", active: true });
    expect(body.policy).toMatchObject({ capacityPerDay: 3, activeBookings: 3 });
    expect(db.writes.some((sql) => sql.includes("insert into booking_waitlist"))).toBe(true);
  });
});
