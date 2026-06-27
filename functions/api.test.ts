import { describe, expect, it, vi } from "vitest";
import { onRequestPost as uploadPhoto } from "./api/admin/photos";
import { onRequestDelete as deletePhoto } from "./api/admin/photos/[id]";
import { onRequestGet as getPublicPhotos } from "./api/photos";
import { onRequestPost as createPaymentIntent } from "./api/payment/create-intent";
import { onRequestPost as confirmPayment } from "./api/payment/confirm";
import { onRequestPost as paymentWebhook } from "./api/payment/webhook";
import { onRequestGet as getPaymentFollowUp } from "./api/admin/payments/follow-up";
import { onRequestPost as expirePaymentFollowUp } from "./api/admin/payments/follow-up";
import { onRequestGet as getAuditLog } from "./api/admin/audit-log";
import { onRequestGet as getErrorReports } from "./api/admin/errors";
import { onRequestPatch as updateErrorReportStatus } from "./api/admin/errors/[id]";
import { onRequestPost as postErrorReport } from "./api/analytics/error";
import { onRequestPost as createShareLink } from "./api/share/create";
import { onRequestPost as resolveShareLink } from "./api/share/resolve";
import { onRequestGet as getUserBookings } from "./api/user/bookings";
import { onRequestGet as getUserProfile } from "./api/user/profile";
import { onRequestPost as cancelUserBooking } from "./api/user/bookings/[id]/cancel";
import { onRequestPost as rescheduleUserBooking } from "./api/user/bookings/[id]/reschedule";
import { createUserSession } from "./_auth";

function jsonRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

function formRequest(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }

  return new Request("https://shoot.custard.top/api/admin/photos", {
    method: "POST",
    body: form,
    headers: { "cf-access-authenticated-user-email": "admin@example.com", "x-nhb-admin-action": "1" },
  });
}

const adminEnv = { ADMIN_PASSWORD: "secret", CF_ACCESS_ADMIN_EMAILS: "admin@example.com" };

function createDb(overrides: {
  all?: () => Promise<{ results: unknown[] }>;
  run?: () => Promise<unknown>;
  first?: () => Promise<unknown>;
} = {}) {
  const statement = {
    bind: vi.fn(() => statement),
    all: vi.fn(overrides.all ?? (async () => ({ results: [] }))),
    run: vi.fn(overrides.run ?? (async () => ({ success: true }))),
    first: vi.fn(overrides.first ?? (async () => null)),
  };

  return {
    statement,
    prepare: vi.fn(() => statement),
  };
}

function createBucket() {
  return {
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
  };
}

async function stripeSignature(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
  const hex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${hex}`;
}

describe("Cloudflare Pages API behavior", () => {
  it("stores client error tracker payloads for admin monitoring", async () => {
    const db = createDb();
    const response = await postErrorReport({
      request: jsonRequest("https://shoot.custard.top/api/analytics/error", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
        body: JSON.stringify({
          id: "err_stage1",
          message: "Editor export failed",
          category: "javascript",
          source: "PhotoEditorPage.tsx:120:8",
          url: "https://shoot.custard.top/editor",
          userAgent: "Vitest",
          stack: "Error: Editor export failed",
          metadata: { workflow: "export" },
          timestamp: "2026-06-28T00:00:00.000Z",
        }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { ok?: boolean; stored?: boolean };

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, stored: true });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("insert into client_error_reports"));
    expect(db.statement.bind).toHaveBeenCalledWith(
      "err_stage1",
      "Editor export failed",
      "javascript",
      "PhotoEditorPage.tsx:120:8",
      "https://shoot.custard.top/editor",
      "Vitest",
      "Error: Editor export failed",
      JSON.stringify({ workflow: "export" }),
      "2026-06-28T00:00:00.000Z",
    );
  });

  it("lists recent client error reports for admins", async () => {
    const db = createDb({
      all: async () => ({
        results: [{
          id: "err_recent",
          message: "Route chunk failed",
          category: "promise",
          source: "unhandledrejection",
          url: "https://shoot.custard.top/gallery",
          user_agent: "Vitest",
          stack: "ChunkLoadError",
          metadata_json: "{\"chunk\":\"gallery\"}",
          status: "open",
          resolution_note: null,
          resolved_at: null,
          resolved_by: null,
          occurred_at: "2026-06-28T00:00:00.000Z",
          created_at: "2026-06-28T00:00:01.000Z",
          updated_at: "2026-06-28T00:00:01.000Z",
        }],
      }),
    });
    const response = await getErrorReports({
      request: jsonRequest("https://shoot.custard.top/api/admin/errors?days=7", {
        headers: { "cf-access-authenticated-user-email": "admin@example.com" },
      }),
      env: { ...adminEnv, DB: db },
    } as never);
    const body = (await response.json()) as { reports?: Array<{ id: string; metadata?: Record<string, unknown> }>; total?: number };

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.reports?.[0]).toMatchObject({ id: "err_recent", metadata: { chunk: "gallery" }, status: "open" });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("from client_error_reports"));
  });

  it("groups duplicate client error reports so admins can triage repeated failures once", async () => {
    const db = createDb({
      all: async () => ({
        results: [
          {
            id: "err_latest",
            message: "Route chunk failed",
            category: "promise",
            source: "unhandledrejection",
            url: "https://shoot.custard.top/gallery",
            user_agent: "Vitest",
            stack: "ChunkLoadError latest",
            metadata_json: "{}",
            status: "open",
            resolution_note: null,
            resolved_at: null,
            resolved_by: null,
            occurred_at: "2026-06-28T00:02:00.000Z",
            created_at: "2026-06-28T00:02:01.000Z",
            updated_at: "2026-06-28T00:02:01.000Z",
          },
          {
            id: "err_older",
            message: "Route chunk failed",
            category: "promise",
            source: "unhandledrejection",
            url: "https://shoot.custard.top/gallery",
            user_agent: "Vitest",
            stack: "ChunkLoadError older",
            metadata_json: "{}",
            status: "open",
            resolution_note: null,
            resolved_at: null,
            resolved_by: null,
            occurred_at: "2026-06-28T00:01:00.000Z",
            created_at: "2026-06-28T00:01:01.000Z",
            updated_at: "2026-06-28T00:01:01.000Z",
          },
        ],
      }),
    });
    const response = await getErrorReports({
      request: jsonRequest("https://shoot.custard.top/api/admin/errors?days=7&limit=50", {
        headers: { "cf-access-authenticated-user-email": "admin@example.com" },
      }),
      env: { ...adminEnv, DB: db },
    } as never);
    const body = (await response.json()) as {
      reports?: Array<{ id: string; occurrenceCount?: number; groupKey?: string; latestOccurredAt?: string }>;
      total?: number;
      reportedTotal?: number;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.reportedTotal).toBe(2);
    expect(body.reports?.[0]).toMatchObject({
      id: "err_latest",
      occurrenceCount: 2,
      latestOccurredAt: "2026-06-28T00:02:00.000Z",
    });
    expect(body.reports?.[0]?.groupKey).toContain("promise|route chunk failed|unhandledrejection|https://shoot.custard.top/gallery");
  });

  it("filters client error reports by admin workflow status", async () => {
    const db = createDb();
    const response = await getErrorReports({
      request: jsonRequest("https://shoot.custard.top/api/admin/errors?days=30&status=resolved", {
        headers: { "cf-access-authenticated-user-email": "admin@example.com" },
      }),
      env: { ...adminEnv, DB: db },
    } as never);

    expect(response.status).toBe(200);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("status = ?"));
    expect(db.statement.bind).toHaveBeenCalledWith("-30 days", "resolved", 250);
  });

  it("updates client error report status with an admin note", async () => {
    const db = createDb();
    const response = await updateErrorReportStatus({
      request: jsonRequest("https://shoot.custard.top/api/admin/errors/err_recent", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "cf-access-authenticated-user-email": "admin@example.com",
          "x-nhb-admin-action": "1",
        },
        body: JSON.stringify({ status: "resolved", note: "Fixed lazy gallery import" }),
      }),
      env: { ...adminEnv, DB: db },
      params: { id: "err_recent" },
    } as never);
    const body = (await response.json()) as { ok?: boolean; status?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, status: "resolved" });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("update client_error_reports"));
    expect(db.statement.bind).toHaveBeenCalledWith("resolved", "Fixed lazy gallery import", "admin@example.com", "err_recent");
  });

  it("returns 404 when a single error status update does not match a report", async () => {
    const db = createDb({ run: async () => ({ success: true, meta: { changes: 0 } }) });
    const response = await updateErrorReportStatus({
      request: jsonRequest("https://shoot.custard.top/api/admin/errors/err_missing", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "cf-access-authenticated-user-email": "admin@example.com",
          "x-nhb-admin-action": "1",
        },
        body: JSON.stringify({ status: "resolved", note: "No matching row" }),
      }),
      env: { ...adminEnv, DB: db },
      params: { id: "err_missing" },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("updates an open duplicate error group from the admin triage action", async () => {
    const db = createDb({
      first: async () => ({
        message: "Route chunk failed",
        category: "promise",
        source: "unhandledrejection",
        url: "https://shoot.custard.top/gallery",
      }),
    });
    const response = await updateErrorReportStatus({
      request: jsonRequest("https://shoot.custard.top/api/admin/errors/err_recent", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "cf-access-authenticated-user-email": "admin@example.com",
          "x-nhb-admin-action": "1",
        },
        body: JSON.stringify({ status: "resolved", note: "Fixed lazy gallery import", scope: "group" }),
      }),
      env: { ...adminEnv, DB: db },
      params: { id: "err_recent" },
    } as never);
    const body = (await response.json()) as { ok?: boolean; scope?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, scope: "group" });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("where status = 'open'"));
    expect(db.statement.bind).toHaveBeenLastCalledWith(
      "resolved",
      "Fixed lazy gallery import",
      "admin@example.com",
      "promise",
      "Route chunk failed",
      "unhandledrejection",
      "https://shoot.custard.top/gallery",
    );
  });

  it("returns 404 when a duplicate error group seed cannot be found", async () => {
    const db = createDb({ first: async () => null });
    const response = await updateErrorReportStatus({
      request: jsonRequest("https://shoot.custard.top/api/admin/errors/err_missing", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "cf-access-authenticated-user-email": "admin@example.com",
          "x-nhb-admin-action": "1",
        },
        body: JSON.stringify({ status: "resolved", note: "No seed", scope: "group" }),
      }),
      env: { ...adminEnv, DB: db },
      params: { id: "err_missing" },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("returns payment readiness details for placeholder payment intents", async () => {
    const db = createDb();
    const response = await createPaymentIntent({
      request: jsonRequest("https://shoot.custard.top/api/payment/create-intent", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nhb-public-action": "1",
        },
        body: JSON.stringify({
          purpose: "booking_deposit",
          amountCents: 2000,
          currency: "cny",
          referenceId: "booking-12345678",
        }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as {
      provider?: string;
      status?: string;
      readiness?: { mode?: string; nextAction?: string; missingConfiguration?: string[] };
    };

    expect(response.status).toBe(201);
    expect(body.provider).toBe("placeholder");
    expect(body.status).toBe("pending");
    expect(body.readiness).toEqual({
      mode: "placeholder",
      nextAction: "manual_follow_up",
      missingConfiguration: ["STRIPE_SECRET_KEY"],
    });
  });

  it("returns a client-safe payment confirmation state and next action", async () => {
    const db = createDb({
      first: async () => ({
        id: "pi_pending123",
        status: "pending",
        amount_cents: 2000,
        currency: "cny",
        purpose: "booking_deposit",
        provider: "placeholder",
      }),
    });

    const response = await confirmPayment({
      request: jsonRequest("https://shoot.custard.top/api/payment/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nhb-public-action": "1",
        },
        body: JSON.stringify({
          paymentIntentId: "pi_pending123",
          clientSecret: "pi_pending123_secret_123",
        }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as {
      status?: string;
      paymentStatus?: string;
      nextAction?: string;
      provider?: string;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("requires_confirmation");
    expect(body.paymentStatus).toBe("pending");
    expect(body.nextAction).toBe("manual_follow_up");
    expect(body.provider).toBe("placeholder");
  });

  it("treats duplicate succeeded payment webhooks as idempotent and skips side effects", async () => {
    const payload = JSON.stringify({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_duplicate",
          status: "succeeded",
          metadata: { booking_id: "booking-12345678" },
        },
      },
    });
    const writes: string[] = [];
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: vi.fn(() => statement),
          first: vi.fn(async () => ({
            id: "pi_duplicate",
            purpose: "booking_deposit",
            reference_id: "booking-12345678",
            status: "succeeded",
          })),
          run: vi.fn(async () => {
            writes.push(sql);
            return { success: true };
          }),
        };
        return statement;
      }),
    };

    const response = await paymentWebhook({
      request: jsonRequest("https://shoot.custard.top/api/payment/webhook", {
        method: "POST",
        headers: { "stripe-signature": await stripeSignature(payload, "whsec_test") },
        body: payload,
      }),
      env: { DB: db, STRIPE_WEBHOOK_SECRET: "whsec_test" },
    } as never);
    const body = (await response.json()) as { received?: boolean; idempotent?: boolean; status?: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, idempotent: true, status: "succeeded" });
    expect(writes).toEqual([]);
  });

  it("handles signed payment webhook status matrix including refunds without success side effects", async () => {
    const cases = [
      { type: "payment_intent.processing", object: { id: "pi_processing", status: "processing" }, expected: "processing" },
      { type: "payment_intent.payment_failed", object: { id: "pi_failed", status: "requires_payment_method" }, expected: "failed" },
      { type: "payment_intent.canceled", object: { id: "pi_cancelled", status: "canceled" }, expected: "cancelled" },
      { type: "charge.refunded", object: { id: "ch_refunded", payment_intent: "pi_refunded", amount_refunded: 2000 }, expected: "refunded" },
    ];

    for (const eventCase of cases) {
      const payload = JSON.stringify({
        type: eventCase.type,
        data: { object: eventCase.object },
      });
      const updates: Array<{ sql: string; args: unknown[] }> = [];
      const sideEffects: string[] = [];
      const db = {
        prepare: vi.fn((sql: string) => {
          const statement = {
            args: [] as unknown[],
            bind: vi.fn((...args: unknown[]) => {
              statement.args = args;
              return statement;
            }),
            first: vi.fn(async () => ({
              id: eventCase.type === "charge.refunded" ? "pi_refunded" : eventCase.object.id,
              purpose: "booking_deposit",
              reference_id: "booking-12345678",
              status: "pending",
            })),
            run: vi.fn(async () => {
              if (sql.includes("UPDATE payment_intents")) {
                updates.push({ sql, args: statement.args });
              } else if (!sql.includes("payment_refunds")) {
                sideEffects.push(sql);
              }
              return { success: true };
            }),
          };
          return statement;
        }),
      };

      const response = await paymentWebhook({
        request: jsonRequest("https://shoot.custard.top/api/payment/webhook", {
          method: "POST",
          headers: { "stripe-signature": await stripeSignature(payload, "whsec_test") },
          body: payload,
        }),
        env: { DB: db, STRIPE_WEBHOOK_SECRET: "whsec_test" },
      } as never);

      expect(response.status).toBe(200);
      expect(updates).toHaveLength(1);
      expect(updates[0]?.args[0]).toBe(eventCase.expected);
      expect(sideEffects).toEqual([]);
    }
  });

  it("records refund webhook metadata for later reconciliation", async () => {
    const payload = JSON.stringify({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_refund_meta",
          payment_intent: "pi_refund_meta",
          amount_refunded: 5000,
          currency: "cny",
        },
      },
    });
    let refundMetadata = "";
    const refundLedgerWrites: Array<{ sql: string; args: unknown[] }> = [];
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          args: [] as unknown[],
          bind: vi.fn((...args: unknown[]) => {
            statement.args = args;
            return statement;
          }),
          first: vi.fn(async () => ({
            id: "pi_refund_meta",
            purpose: "booking_deposit",
            reference_id: "booking-12345678",
            status: "succeeded",
            metadata: JSON.stringify({ packageName: "Portrait Session" }),
          })),
          run: vi.fn(async () => {
            if (sql.includes("metadata = ?")) {
              refundMetadata = String(statement.args[1]);
            }
            if (sql.includes("payment_refunds")) {
              refundLedgerWrites.push({ sql, args: statement.args });
            }
            return { success: true };
          }),
        };
        return statement;
      }),
    };

    const response = await paymentWebhook({
      request: jsonRequest("https://shoot.custard.top/api/payment/webhook", {
        method: "POST",
        headers: { "stripe-signature": await stripeSignature(payload, "whsec_test") },
        body: payload,
      }),
      env: { DB: db, STRIPE_WEBHOOK_SECRET: "whsec_test" },
    } as never);
    const metadata = JSON.parse(refundMetadata) as {
      packageName?: string;
      refund?: { chargeId?: string; amountRefunded?: number; currency?: string; status?: string; receivedAt?: string };
    };

    expect(response.status).toBe(200);
    expect(metadata.packageName).toBe("Portrait Session");
    expect(metadata.refund).toMatchObject({
      chargeId: "ch_refund_meta",
      amountRefunded: 5000,
      currency: "cny",
      status: "refunded",
    });
    expect(metadata.refund?.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(refundLedgerWrites).toHaveLength(1);
    expect(refundLedgerWrites[0]?.sql).toContain("ON CONFLICT(charge_id)");
    expect(refundLedgerWrites[0]?.args).toEqual([
      "ch_refund_meta",
      "pi_refund_meta",
      "ch_refund_meta",
      5000,
      "cny",
      "refunded",
      "charge.refunded",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      expect.stringContaining('"payment_intent":"pi_refund_meta"'),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    ]);
  });

  it("projects the latest booking deposit state into the customer booking list", async () => {
    const secret = "test-auth-secret-with-32-characters";
    const session = await createUserSession("user-12345678", secret);
    const projectedBooking = {
      id: "booking-12345678",
      package_name: "Portrait Session",
      preferred_date: "2099-01-01",
      preferred_time: "morning",
      name: "Guest",
      contact: "guest@example.com",
      notes: "",
      status: "confirmed",
      created_at: "2026-06-26T00:00:00.000Z",
      payment_intent_id: "pi_123",
      payment_status: "canceled",
      payment_provider: "placeholder",
      payment_amount_cents: 2000,
      payment_currency: "cny",
    };
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: vi.fn(() => statement),
          first: vi.fn(async () => (
            sql.includes("from users")
              ? { id: "user-12345678", email: "guest@example.com" }
              : null
          )),
          all: vi.fn(async () => ({ results: [projectedBooking] })),
        };
        return statement;
      }),
    };

    const response = await getUserBookings({
      request: jsonRequest("https://shoot.custard.top/api/user/bookings", {
        headers: { cookie: `nhb_user_session=${session}` },
      }),
      env: { DB: db, AUTH_SECRET: secret },
    } as never);
    const body = (await response.json()) as {
      bookings?: Array<{ payment_status?: string; payment_amount_cents?: number }>;
    };

    expect(response.status).toBe(200);
    expect(body.bookings?.[0]?.payment_status).toBe("cancelled");
    expect(body.bookings?.[0]?.payment_amount_cents).toBe(2000);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("payment_intents"));
  });

  it("writes the canonical cancelled status for customer cancellations", async () => {
    const secret = "test-auth-secret-with-32-characters";
    const session = await createUserSession("user-12345678", secret);
    const writes: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: vi.fn((...values: unknown[]) => {
            if (sql.includes("update booking_requests")) writes.push({ sql, values });
            return statement;
          }),
          first: vi.fn(async () => {
            if (sql.includes("from users")) return { id: "user-12345678", email: "guest@example.com" };
            if (sql.includes("from booking_requests")) {
              return { id: "booking-12345678", contact: "guest@example.com", status: "confirmed" };
            }
            return null;
          }),
          run: vi.fn(async () => ({ success: true })),
        };
        return statement;
      }),
    };

    const response = await cancelUserBooking({
      request: jsonRequest("https://shoot.custard.top/api/user/bookings/booking-12345678/cancel", {
        method: "POST",
        headers: { cookie: `nhb_user_session=${session}` },
      }),
      env: { DB: db, AUTH_SECRET: secret },
      params: { id: "booking-12345678" },
    } as never);

    expect(response.status).toBe(200);
    expect(writes[0]?.sql).toContain("status = 'cancelled'");
  });

  it("rejects past customer reschedule dates", async () => {
    const secret = "test-auth-secret-with-32-characters";
    const session = await createUserSession("user-12345678", secret);

    const response = await rescheduleUserBooking({
      request: jsonRequest("https://shoot.custard.top/api/user/bookings/booking-12345678/reschedule", {
        method: "POST",
        headers: {
          cookie: `nhb_user_session=${session}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ preferred_date: "2020-01-01" }),
      }),
      env: { DB: createDb(), AUTH_SECRET: secret },
      params: { id: "booking-12345678" },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("不能早于今天");
  });

  it("rejects rescheduling into a fully booked date", async () => {
    const secret = "test-auth-secret-with-32-characters";
    const session = await createUserSession("user-12345678", secret);
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: vi.fn(() => statement),
          first: vi.fn(async () => {
            if (sql.includes("from users")) return { id: "user-12345678", email: "guest@example.com" };
            if (sql.includes("select id, contact, status")) {
              return { id: "booking-12345678", contact: "guest@example.com", status: "confirmed" };
            }
            if (sql.includes("count(*) as count")) return { count: 3 };
            return null;
          }),
          run: vi.fn(async () => ({ success: true })),
        };
        return statement;
      }),
    };

    const response = await rescheduleUserBooking({
      request: jsonRequest("https://shoot.custard.top/api/user/bookings/booking-12345678/reschedule", {
        method: "POST",
        headers: {
          cookie: `nhb_user_session=${session}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ preferred_date: "2099-01-01" }),
      }),
      env: { DB: db, AUTH_SECRET: secret },
      params: { id: "booking-12345678" },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(409);
    expect(body.error).toContain("已约满");
  });

  it("returns a static public photo fallback when D1 is unavailable", async () => {
    const db = createDb({
      all: async () => {
        throw new Error("d1 unavailable");
      },
    });

    const response = await getPublicPhotos({
      request: jsonRequest("https://shoot.custard.top/api/photos"),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { photos?: unknown[]; source?: string };

    expect(response.status).toBe(200);
    expect(body.source).toBe("defaults");
    expect(body.photos?.length).toBeGreaterThan(0);
  });

  it("deletes an uploaded R2 object when the D1 insert fails", async () => {
    const db = createDb({
      run: async () => {
        throw new Error("insert failed");
      },
    });
    const bucket = createBucket();
    const file = new File([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], "photo.webp", { type: "image/webp" });

    const response = await uploadPhoto({
      request: formRequest({
        photo: file,
        title: "测试作品",
        style: "jiangnan",
        location: "南京",
        featured: "true",
        clientAuthorized: "true",
      }),
      env: { DB: db, PHOTO_BUCKET: bucket, ...adminEnv },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toContain("上传失败");
    expect(bucket.put).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledTimes(1);
  });

  it("keeps the D1 photo row when R2 deletion fails", async () => {
    const db = createDb({
      first: async () => ({ object_key: "gallery/photo.webp" }),
    });
    const bucket = createBucket();
    bucket.delete.mockRejectedValueOnce(new Error("r2 failed"));

    const response = await deletePhoto({
      request: jsonRequest("https://shoot.custard.top/api/admin/photos/photo-id", {
        method: "DELETE",
        headers: { "cf-access-authenticated-user-email": "admin@example.com", "x-nhb-admin-action": "1" },
      }),
      env: { DB: db, PHOTO_BUCKET: bucket, ...adminEnv },
      params: { id: "photo-id" },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toContain("删除失败");
    expect(db.statement.run).not.toHaveBeenCalled();
  });

  it("returns JSON auth errors for unsupported profile reads instead of SPA HTML", async () => {
    const response = await getUserProfile({
      request: jsonRequest("https://shoot.custard.top/api/user/profile"),
      env: {},
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.error).toBe("请先登录");
  });

  it("rejects unsigned Stripe webhook requests before checking deployment secrets", async () => {
    const response = await paymentWebhook({
      request: jsonRequest("https://shoot.custard.top/api/payment/webhook", {
        method: "POST",
        body: JSON.stringify({ type: "payment_intent.succeeded" }),
      }),
      env: { DB: createDb() },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid webhook signature");
  });

  it("lists stale placeholder payment intents for admin follow-up", async () => {
    const now = new Date();
    const oldIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const all = vi.fn(async () => ({
      results: [
        {
          id: "pi_old_1",
          purpose: "booking_deposit",
          reference_id: "booking-old-1",
          amount_cents: 5000,
          currency: "usd",
          status: "pending",
          provider: "placeholder",
          created_at: oldIso,
          updated_at: oldIso,
          age_minutes: 60,
        },
      ],
    }));
    const db = createDb({ all });

    const response = await getPaymentFollowUp({
      request: jsonRequest("https://shoot.custard.top/api/admin/payments/follow-up?timeoutMinutes=30", {
        headers: { "cf-access-authenticated-user-email": "admin@example.com" },
      }),
      env: { DB: db, ...adminEnv },
    } as never);
    const body = (await response.json()) as { payments: Array<{ id: string; isStale: boolean; age_minutes: number }>; count: number; timeoutMinutes: number };

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.payments[0].id).toBe("pi_old_1");
    expect(body.payments[0].isStale).toBe(true);
    expect(body.payments[0].age_minutes).toBe(60);
    expect(body.timeoutMinutes).toBe(30);
  });

  it("expires stale placeholder payment intents and skips already-changed rows", async () => {
    const candidates = vi.fn(async () => ({
      results: [
        { id: "pi_stale_1", status: "pending", metadata: JSON.stringify({ foo: "bar" }) },
        { id: "pi_stale_2", status: "pending", metadata: null },
      ],
    }));
    const run = vi.fn(async () => ({ success: true, meta: { changes: 1 } }));
    const db = createDb({ all: candidates, run });

    const response = await expirePaymentFollowUp({
      request: jsonRequest("https://shoot.custard.top/api/admin/payments/follow-up", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-access-authenticated-user-email": "admin@example.com", "x-nhb-admin-action": "1" },
        body: JSON.stringify({ timeoutMinutes: 45 }),
      }),
      env: { DB: db, ...adminEnv },
    } as never);
    const body = (await response.json()) as { ok: boolean; expired: string[]; expiredCount: number; timeoutMinutes: number };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.expired).toEqual(["pi_stale_1", "pi_stale_2"]);
    expect(body.expiredCount).toBe(2);
    expect(body.timeoutMinutes).toBe(45);
    expect(db.statement.bind).toHaveBeenCalled();
  });

  it("searches admin audit log with filters and reports total count", async () => {
    const all = vi.fn(async () => ({
      results: [
        {
          id: 42,
          action: "update",
          entity_type: "photo",
          entity_id: "photo-abc",
          admin_user: "admin@example.com",
          diff_json: JSON.stringify({ title: { from: "A", to: "B" } }),
          created_at: "2026-06-27T10:00:00.000Z",
        },
      ],
    }));
    const first = vi.fn(async () => ({ total: 1 }));
    const db = createDb({ all, first });

    const response = await getAuditLog({
      request: jsonRequest("https://shoot.custard.top/api/admin/audit-log?q=abc&entity_type=photo&action=update&from=2026-06-01&to=2026-06-30&limit=10&offset=0", {
        headers: { "cf-access-authenticated-user-email": "admin@example.com" },
      }),
      env: { DB: db, ...adminEnv },
    } as never);
    const body = (await response.json()) as { entries: Array<{ id: number; diff: { title: { from: string; to: string } } }>; total: number; hasMore: boolean; filters: { search: string | null; entityType: string | null; action: string | null } };

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].diff.title.to).toBe("B");
    expect(body.hasMore).toBe(false);
    expect(body.filters.search).toBe("abc");
    expect(body.filters.entityType).toBe("photo");
    expect(body.filters.action).toBe("update");
  });

  it("exports admin audit log to CSV when format=csv", async () => {
    const all = vi.fn(async () => ({
      results: [
        {
          id: 1,
          action: "delete",
          entity_type: "photo",
          entity_id: 'photo"x',
          admin_user: "admin@example.com",
          diff_json: JSON.stringify({ removed: true }),
          created_at: "2026-06-27T10:00:00.000Z",
        },
      ],
    }));
    const first = vi.fn(async () => ({ total: 1 }));
    const db = createDb({ all, first });

    const response = await getAuditLog({
      request: jsonRequest("https://shoot.custard.top/api/admin/audit-log?format=csv", {
        headers: { "cf-access-authenticated-user-email": "admin@example.com" },
      }),
      env: { DB: db, ...adminEnv },
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    const text = await response.text();
    expect(text.split("\n")[0]).toBe("id,created_at,action,entity_type,entity_id,admin_user,diff");
    expect(text).toContain('"photo""x"');
  });

  it("creates a share link with privacy controls and no-store cache header", async () => {
    const run = vi.fn(async () => ({ success: true }));
    const db = createDb({ run });

    const response = await createShareLink({
      request: jsonRequest("https://shoot.custard.top/api/share/create", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
        body: JSON.stringify({
          resourceType: "photo",
          resourceId: "photo-abc",
          password: "secret123",
          maxViews: 5,
          expiresInDays: 7,
        }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { ok: boolean; link: { token: string; requiresPassword: boolean; maxViews: number; expiresAt: string } };

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.ok).toBe(true);
    expect(body.link.requiresPassword).toBe(true);
    expect(body.link.maxViews).toBe(5);
    expect(body.link.expiresAt).not.toBeNull();
    expect(body.link.token).toHaveLength(24);
  });

  it("rejects share link creation with invalid resource type", async () => {
    const response = await createShareLink({
      request: jsonRequest("https://shoot.custard.top/api/share/create", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
        body: JSON.stringify({ resourceType: "invalid", resourceId: "x" }),
      }),
      env: { DB: createDb() },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid resource type");
  });

  it("resolves a valid share link and increments view count", async () => {
    const first = vi.fn(async () => ({
      id: "share_1",
      token: "abcdef0123456789abcdef01",
      resource_type: "photo",
      resource_id: "photo-1",
      visibility: "public",
      password_hash: null,
      max_views: 10,
      view_count: 3,
      expires_at: null,
      created_at: "2026-06-27T00:00:00.000Z",
      created_by: "admin",
    }));
    const run = vi.fn(async () => ({ success: true, meta: { changes: 1 } }));
    const db = createDb({ first, run });

    const response = await resolveShareLink({
      request: jsonRequest("https://shoot.custard.top/api/share/resolve", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
        body: JSON.stringify({ token: "abcdef0123456789abcdef01" }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { ok: boolean; viewCount: number; resource: { type: string; id: string } };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.ok).toBe(true);
    expect(body.viewCount).toBe(4);
    expect(body.resource.type).toBe("photo");
  });

  it("returns 404 for unknown share tokens", async () => {
    const first = vi.fn(async () => null);
    const db = createDb({ first });

    const response = await resolveShareLink({
      request: jsonRequest("https://shoot.custard.top/api/share/resolve", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
        body: JSON.stringify({ token: "abcdef0123456789abcdef01" }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("returns 401 when a password-protected share link is requested without a password", async () => {
    const first = vi.fn(async () => ({
      id: "share_pwd",
      token: "abcdef0123456789abcdef01",
      resource_type: "photo",
      resource_id: "photo-pwd",
      visibility: "unlisted",
      password_hash: "hashed-value",
      max_views: 10,
      view_count: 0,
      expires_at: null,
      created_at: "2026-06-27T00:00:00.000Z",
      created_by: "admin",
    }));
    const db = createDb({ first });

    const response = await resolveShareLink({
      request: jsonRequest("https://shoot.custard.top/api/share/resolve", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
        body: JSON.stringify({ token: "abcdef0123456789abcdef01" }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("password_required");
  });
});
