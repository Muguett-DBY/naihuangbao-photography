import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createUserSession } from "./_auth";
import { onRequestPost as submitBooking } from "./api/booking";
import { onRequestPost as joinWaitlist } from "./api/booking/waitlist";
import { onRequestPost as registerWorkshop } from "./api/workshops/[id]/register";
import { onRequestGet as getUserBookings } from "./api/user/bookings";
import { onRequestGet as getUserWorkshops } from "./api/user/workshops";
import { onRequestGet as getUserStats } from "./api/user/stats";
import { onRequestPost as cancelUserBooking } from "./api/user/bookings/[id]/cancel";
import { onRequestPost as rescheduleUserBooking } from "./api/user/bookings/[id]/reschedule";

const secret = "test-auth-secret-with-32-characters";
const ownerUserId = "user-owner-12345678";

type RecordedStatement = {
  sql: string;
  values: unknown[];
};

function createRecordingDb(options: {
  first?: (sql: string, values: unknown[]) => unknown;
  all?: (sql: string, values: unknown[]) => unknown[];
} = {}) {
  const statements: RecordedStatement[] = [];
  const db = {
    statements,
    prepare: vi.fn((sql: string) => {
      const record: RecordedStatement = { sql, values: [] };
      statements.push(record);
      const statement = {
        bind: vi.fn((...values: unknown[]) => {
          record.values = values;
          return statement;
        }),
        first: vi.fn(async () => options.first?.(sql, record.values) ?? null),
        all: vi.fn(async () => ({ results: options.all?.(sql, record.values) ?? [] })),
        run: vi.fn(async () => ({ success: true })),
      };
      return statement;
    }),
    batch: vi.fn(async (batchStatements: unknown[]) => batchStatements.map(() => ({ success: true }))),
  };
  return db;
}

async function signedCookie(userId = ownerUserId) {
  return `nhb_user_session=${await createUserSession(userId, secret)}`;
}

async function bookingRequest(authenticated: boolean) {
  return new Request("https://shoot.custard.top/api/booking", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nhb-public-action": "1",
      ...(authenticated ? { cookie: await signedCookie() } : {}),
    },
    body: JSON.stringify({
      packageName: "Portrait Session",
      preferredDate: "2099-01-02",
      preferredTime: "morning",
      name: "Guest",
      contact: "guest@example.com",
      notes: "",
    }),
  });
}

async function waitlistRequest(authenticated: boolean) {
  return new Request("https://shoot.custard.top/api/booking/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nhb-public-action": "1",
      ...(authenticated ? { cookie: await signedCookie() } : {}),
    },
    body: JSON.stringify({
      preferredDate: "2099-01-02",
      contact: "guest@example.com",
      name: "Guest",
      packageName: "Portrait Session",
    }),
  });
}

describe("customer record ownership", () => {
  it("declares additive user ownership columns without contact backfill", () => {
    const migrationPath = resolve(process.cwd(), "db/migrations/015_add_customer_record_owners.sql");
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, "utf8");
    const schema = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8");
    const authSource = readFileSync(resolve(process.cwd(), "functions/_auth.ts"), "utf8");

    for (const table of ["booking_requests", "booking_waitlist", "workshop_registrations"]) {
      expect(migration).toContain(`alter table ${table} add column user_id`);
    }
    for (const index of [
      "idx_booking_requests_user",
      "idx_booking_waitlist_user",
      "idx_workshop_registrations_user",
    ]) {
      expect(migration).toContain(index);
      expect(schema).toContain(index);
    }
    expect(migration.toLowerCase()).not.toMatch(/update\s+\w+\s+set\s+user_id[\s\S]+contact/);
    expect(authSource).toContain("getOptionalUserId");
  });

  it("links an authenticated booking to the session user", async () => {
    const db = createRecordingDb();
    const response = await submitBooking({
      request: await bookingRequest(true),
      env: { DB: db, AUTH_SECRET: secret },
    } as never);
    const body = (await response.json()) as { accountLinked?: boolean };
    const insert = db.statements.find((entry) => entry.sql.includes("insert into booking_requests"));

    expect(response.status).toBe(201);
    expect(body.accountLinked).toBe(true);
    expect(insert?.sql).toContain("user_id");
    expect(insert?.values).toContain(ownerUserId);
  });

  it("keeps an anonymous booking unowned", async () => {
    const db = createRecordingDb();
    const response = await submitBooking({
      request: await bookingRequest(false),
      env: { DB: db, AUTH_SECRET: secret },
    } as never);
    const body = (await response.json()) as { accountLinked?: boolean };
    const insert = db.statements.find((entry) => entry.sql.includes("insert into booking_requests"));

    expect(response.status).toBe(201);
    expect(body.accountLinked).toBe(false);
    expect(insert?.sql).toContain("user_id");
    expect(insert?.values).toContain(null);
  });

  it("links authenticated waitlist and workshop submissions", async () => {
    const waitlistDb = createRecordingDb({
      first: (sql) => {
        if (sql.includes("from booking_requests")) return { count: 3 };
        if (sql.includes("count(*) as c")) return { c: 0 };
        return null;
      },
    });
    const waitlistResponse = await joinWaitlist({
      request: await waitlistRequest(true),
      env: { DB: waitlistDb, AUTH_SECRET: secret },
    } as never);
    const waitlistBody = (await waitlistResponse.json()) as { accountLinked?: boolean };
    const waitlistInsert = waitlistDb.statements.find((entry) => entry.sql.includes("insert into booking_waitlist"));

    const workshopDb = createRecordingDb({
      first: (sql) => sql.includes("from workshops")
        ? { id: "workshop-123", max_participants: 10, current_participants: 0 }
        : null,
    });
    const workshopResponse = await registerWorkshop({
      request: new Request("https://shoot.custard.top/api/workshops/workshop-123/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nhb-public-action": "1",
          cookie: await signedCookie(),
        },
        body: JSON.stringify({ name: "Guest", contact: "guest@example.com", participants: 1 }),
      }),
      env: { DB: workshopDb, AUTH_SECRET: secret },
      params: { id: "workshop-123" },
    } as never);
    const workshopBody = (await workshopResponse.json()) as { accountLinked?: boolean };
    const workshopInsert = workshopDb.statements.find((entry) => entry.sql.includes("insert into workshop_registrations"));

    expect(waitlistResponse.status).toBe(201);
    expect(waitlistBody.accountLinked).toBe(true);
    expect(waitlistInsert?.sql).toContain("user_id");
    expect(waitlistInsert?.values).toContain(ownerUserId);
    expect(workshopResponse.status).toBe(201);
    expect(workshopBody.accountLinked).toBe(true);
    expect(workshopInsert?.sql).toContain("user_id");
    expect(workshopInsert?.values).toContain(ownerUserId);
  });

  it("scopes customer booking, waitlist, workshop, and statistic reads by user ID", async () => {
    const cookie = await signedCookie();
    const bookingDb = createRecordingDb({
      first: (sql) => sql.includes("from users") ? { email: "guest@example.com" } : null,
    });
    await getUserBookings({
      request: new Request("https://shoot.custard.top/api/user/bookings", { headers: { cookie } }),
      env: { DB: bookingDb, AUTH_SECRET: secret },
    } as never);

    const workshopDb = createRecordingDb();
    await getUserWorkshops({
      request: new Request("https://shoot.custard.top/api/user/workshops", { headers: { cookie } }),
      env: { DB: workshopDb, AUTH_SECRET: secret },
    } as never);

    const statsDb = createRecordingDb({
      first: () => ({ total: 0, upcoming: 0 }),
    });
    await getUserStats({
      request: new Request("https://shoot.custard.top/api/user/stats", { headers: { cookie } }),
      env: { DB: statsDb, AUTH_SECRET: secret },
    } as never);

    const bookingQuery = bookingDb.statements.find((entry) => entry.sql.includes("from booking_requests"));
    const waitlistQuery = bookingDb.statements.find((entry) => entry.sql.includes("from booking_waitlist"));
    const workshopQuery = workshopDb.statements.find((entry) => entry.sql.includes("from workshop_registrations"));
    const statsQueries = statsDb.statements.filter((entry) => (
      entry.sql.includes("from booking_requests") || entry.sql.includes("from workshop_registrations")
    ));

    expect(bookingQuery?.sql).toContain("b.user_id = ?");
    expect(bookingQuery?.values).toEqual([ownerUserId]);
    expect(waitlistQuery?.sql).toContain("user_id = ?");
    expect(waitlistQuery?.values).toEqual([ownerUserId]);
    expect(workshopQuery?.sql).toContain("wr.user_id = ?");
    expect(workshopQuery?.values).toEqual([ownerUserId]);
    expect(statsQueries).toHaveLength(2);
    for (const query of statsQueries) {
      expect(query.sql).toContain("user_id = ?");
      expect(query.sql.toLowerCase()).not.toContain("contact like");
      expect(query.values).toEqual([ownerUserId]);
    }
  });

  it("rejects same-contact booking mutations owned by a different user", async () => {
    const cookie = await signedCookie();
    const ownerMismatch = "user-other-87654321";
    const cancelDb = createRecordingDb({
      first: (sql) => {
        if (sql.includes("from users")) return { id: ownerUserId, email: "guest@example.com" };
        if (sql.includes("from booking_requests")) {
          return { id: "booking-12345678", user_id: ownerMismatch, contact: "guest@example.com", status: "confirmed" };
        }
        return null;
      },
    });
    const cancelResponse = await cancelUserBooking({
      request: new Request("https://shoot.custard.top/api/user/bookings/booking-12345678/cancel", {
        method: "POST",
        headers: { cookie, "x-nhb-public-action": "1" },
      }),
      env: { DB: cancelDb, AUTH_SECRET: secret },
      params: { id: "booking-12345678" },
    } as never);

    const rescheduleDb = createRecordingDb({
      first: (sql) => {
        if (sql.includes("from users")) return { id: ownerUserId, email: "guest@example.com" };
        if (sql.includes("from booking_requests")) {
          return {
            id: "booking-12345678",
            user_id: ownerMismatch,
            contact: "guest@example.com",
            status: "confirmed",
            preferred_date: "2099-01-01",
            preferred_time: "morning",
          };
        }
        return null;
      },
    });
    const rescheduleResponse = await rescheduleUserBooking({
      request: new Request("https://shoot.custard.top/api/user/bookings/booking-12345678/reschedule", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
          "x-nhb-public-action": "1",
        },
        body: JSON.stringify({ preferred_date: "2099-01-02", preferred_time: "afternoon" }),
      }),
      env: { DB: rescheduleDb, AUTH_SECRET: secret },
      params: { id: "booking-12345678" },
    } as never);

    expect(cancelResponse.status).toBe(403);
    expect(rescheduleResponse.status).toBe(403);
    expect(cancelDb.statements.some((entry) => entry.sql.includes("update booking_requests"))).toBe(false);
    expect(rescheduleDb.statements.some((entry) => entry.sql.includes("update booking_requests"))).toBe(false);
  });
});
