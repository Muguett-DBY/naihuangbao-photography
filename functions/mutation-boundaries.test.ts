import { describe, expect, it } from "vitest";
import { onRequestPost as submitBooking } from "./api/booking";
import { onRequestPost as joinWaitlist } from "./api/booking/waitlist";
import { onRequestPost as cancelUserBooking } from "./api/user/bookings/[id]/cancel";
import { onRequestPost as rescheduleUserBooking } from "./api/user/bookings/[id]/reschedule";
import { onRequestPut as updateUserProfile } from "./api/user/profile";
import { onRequestPost as recordPresetDownload } from "./api/presets/[id]/download";
import { onRequestDelete as deleteAdminSession } from "./api/admin/session";

const authSecret = "test-auth-secret-with-32-characters";

describe("mutation request boundaries", () => {
  it.each([
    ["profile update", updateUserProfile, "/api/user/profile", "PUT", {}],
    ["booking cancellation", cancelUserBooking, "/api/user/bookings/booking-12345678/cancel", "POST", {}],
    ["booking reschedule", rescheduleUserBooking, "/api/user/bookings/booking-12345678/reschedule", "POST", { preferred_date: "2099-01-01" }],
  ])("rejects a cookie-authenticated %s without the public action header", async (_label, handler, path, method, body) => {
    const response = await handler({
      request: new Request(`https://shoot.custard.top${path}`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      env: { AUTH_SECRET: authSecret },
      params: { id: "booking-12345678" },
    } as never);

    expect(response.status).toBe(403);
  });

  it.each(["2099-02-31", "2020-01-01"])("rejects invalid waitlist date %s", async (preferredDate) => {
    const response = await joinWaitlist({
      request: new Request("https://shoot.custard.top/api/booking/waitlist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nhb-public-action": "1",
        },
        body: JSON.stringify({
          preferredDate,
          contact: "guest@example.com",
          name: "Guest",
        }),
      }),
      env: {},
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("日期");
  });

  it.each(["2099-02-31", "2020-01-01"])("rejects invalid booking date %s", async (preferredDate) => {
    const db = {
      prepare: () => {
        const statement = {
          bind: () => statement,
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
          first: async () => null,
        };
        return statement;
      },
    };
    const response = await submitBooking({
      request: new Request("https://shoot.custard.top/api/booking", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nhb-public-action": "1",
        },
        body: JSON.stringify({
          preferredDate,
          preferredTime: "10:00",
          contact: "guest@example.com",
          name: "Guest",
        }),
      }),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("日期");
  });

  it("rejects preset download counter writes without the public action header", async () => {
    const response = await recordPresetDownload({
      request: new Request("https://shoot.custard.top/api/presets/preset-123/download", {
        method: "POST",
      }),
      env: {},
      params: { id: "preset-123" },
    } as never);

    expect(response.status).toBe(403);
  });

  it("rejects admin logout without the admin action header", async () => {
    const response = await deleteAdminSession({
      request: new Request("https://shoot.custard.top/api/admin/session", {
        method: "DELETE",
      }),
      env: {},
    } as never);

    expect(response.status).toBe(403);
  });
});
