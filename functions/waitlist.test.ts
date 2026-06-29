import { describe, expect, it, vi } from "vitest";
import { onRequestPost as joinWaitlist } from "./api/booking/waitlist";

type ExistingWaitlist = {
  id: string;
  token: string;
  preferred_date: string;
  active: number;
  created_at: string;
};

function createWaitlistDb(activeBookings: number, activeWaitlist = 0, existingWaitlist: ExistingWaitlist | null = null) {
  const writes: string[] = [];
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        all: vi.fn(async () => ({ results: [] })),
        first: vi.fn(async () => {
          if (sql.includes("from booking_requests")) return { count: activeBookings };
          if (sql.includes("from booking_waitlist") && sql.includes("lower(contact)")) return existingWaitlist;
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

  it("returns an existing active waitlist entry without inserting a duplicate", async () => {
    const db = createWaitlistDb(3, 1, {
      id: "wl_existing_123456",
      token: "existingtoken123",
      preferred_date: "2099-01-01",
      active: 1,
      created_at: "2099-01-01T08:00:00.000Z",
    });
    const response = await joinWaitlist({
      request: waitlistRequest(),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as {
      ok?: boolean;
      message?: string;
      waitlist?: { id?: string; preferredDate?: string; duplicate?: boolean; unsubscribeToken?: string };
      policy?: { capacityPerDay?: number; activeBookings?: number };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.message).toBe("already_waitlisted");
    expect(body.waitlist).toMatchObject({
      id: "wl_existing_123456",
      preferredDate: "2099-01-01",
      duplicate: true,
    });
    expect(body.waitlist?.unsubscribeToken).toBeUndefined();
    expect(body.policy).toMatchObject({ capacityPerDay: 3, activeBookings: 3 });
    expect(db.writes.some((sql) => sql.includes("insert into booking_waitlist"))).toBe(false);
  });
});
