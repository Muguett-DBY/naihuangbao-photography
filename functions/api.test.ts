import { describe, expect, it, vi } from "vitest";
import { onRequestPost as uploadPhoto } from "./api/admin/photos";
import { onRequestDelete as deletePhoto } from "./api/admin/photos/[id]";
import { onRequestGet as getPublicPhotos } from "./api/photos";
import { onRequestPost as paymentWebhook } from "./api/payment/webhook";
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

describe("Cloudflare Pages API behavior", () => {
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
});
