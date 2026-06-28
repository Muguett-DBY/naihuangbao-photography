import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost as sendNotification } from "./api/notifications/send";

function notificationRequest(body: unknown) {
  return new Request("https://shoot.custard.top/api/notifications/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nhb-public-action": "1",
    },
    body: JSON.stringify(body),
  });
}

describe("transactional notification delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends escaped notification HTML through Resend", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: "email-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await sendNotification({
      request: notificationRequest({
        type: "booking_confirmation",
        to: "guest@example.com",
        data: {
          name: '<img src=x onerror="alert(1)">',
          packageName: "Portrait Session",
          bookingId: "booking-1",
        },
      }),
      env: {
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "Naihuangbao <booking@shoot.custard.top>",
      },
    } as never);
    const body = (await response.json()) as { ok?: boolean; message?: string };
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(init?.body ?? "{}")) as {
      from?: string;
      to?: string[];
      subject?: string;
      html?: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, message: "Notification sent" });
    expect(url).toBe("https://api.resend.com/emails");
    expect(payload.from).toBe("Naihuangbao <booking@shoot.custard.top>");
    expect(payload.to).toEqual(["guest@example.com"]);
    expect(payload.subject).toContain("Booking Confirmation");
    expect(payload.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(payload.html).not.toContain("<img src=x");
  });

  it("returns unavailable instead of claiming delivery without a provider", async () => {
    const response = await sendNotification({
      request: notificationRequest({
        type: "booking_confirmation",
        to: "guest@example.com",
        data: { bookingId: "booking-1" },
      }),
      env: {},
    } as never);
    const body = (await response.json()) as { error?: string; message?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Email delivery is not configured");
    expect(body.message).toBeUndefined();
  });
});
