import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalNotification } from "./_notifications";
import { onRequestPost as sendNotification } from "./api/notifications/send";

describe("transactional notification delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends escaped HTML only through the server transaction helper", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTransactionalNotification({
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "Naihuangbao <booking@shoot.custard.top>",
    } as never, "booking_confirmation", "guest@example.com", {
      name: '<img src=x onerror="alert(1)">',
      packageName: "Portrait Session",
      bookingId: "booking-1",
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(init?.body ?? "{}")) as { from?: string; to?: string[]; html?: string };

    expect(result).toEqual({ sent: true });
    expect(url).toBe("https://api.resend.com/emails");
    expect(payload.from).toBe("Naihuangbao <booking@shoot.custard.top>");
    expect(payload.to).toEqual(["guest@example.com"]);
    expect(payload.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(payload.html).not.toContain("<img src=x");
  });

  it("disables arbitrary browser-originated notification requests", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const response = await sendNotification({
      request: new Request("https://shoot.custard.top/api/notifications/send", {
        method: "POST",
        body: JSON.stringify({ type: "booking_confirmation", to: "victim@example.com", data: {} }),
      }),
      env: { RESEND_API_KEY: "re_test_key" },
    } as never);

    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("disabled") });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
