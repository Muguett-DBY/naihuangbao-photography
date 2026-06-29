import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost as forgotPassword } from "./api/auth/forgot-password";

function jsonRequest(body: unknown) {
  return new Request("https://shoot.custard.top/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "127.0.0.1",
      "x-nhb-public-action": "1",
    },
    body: JSON.stringify(body),
  });
}

function createPasswordResetDb() {
  return {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        run: vi.fn(async () => ({ success: true })),
        all: vi.fn(async () => ({ results: [] })),
        first: vi.fn(async () => (
          sql.includes("from users")
            ? { id: "user-1", email: "guest@example.com" }
            : null
        )),
      };
      return statement;
    }),
  };
}

describe("password reset email delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the reset token through Resend when email delivery is configured", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: "email-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await forgotPassword({
      request: jsonRequest({ email: "guest@example.com" }),
      env: {
        DB: createPasswordResetDb(),
        RESEND_API_KEY: "re_test_key",
        RESET_EMAIL_FROM: "Naihuangbao <reset@shoot.custard.top>",
      },
    } as never);
    const body = (await response.json()) as { ok?: boolean; demo_token?: string };
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}")) as {
      from?: string;
      to?: string[];
      subject?: string;
      text?: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.demo_token).toBeUndefined();
    expect(url).toBe("https://api.resend.com/emails");
    expect((init as RequestInit).headers).toMatchObject({
      authorization: "Bearer re_test_key",
      "content-type": "application/json",
    });
    expect(payload.from).toBe("Naihuangbao <reset@shoot.custard.top>");
    expect(payload.to).toEqual(["guest@example.com"]);
    expect(payload.subject).toContain("密码重置");
    expect(payload.text).toMatch(/[a-f0-9]{64}/);
  });

  it("keeps the anti-enumeration response when Resend rejects the message", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response("provider error", { status: 503 })));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await forgotPassword({
      request: jsonRequest({ email: "guest@example.com" }),
      env: {
        DB: createPasswordResetDb(),
        RESEND_API_KEY: "re_test_key",
      },
    } as never);
    const body = (await response.json()) as { ok?: boolean; demo_token?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.demo_token).toBeUndefined();
    expect(warning).toHaveBeenCalled();
  });

  it("does not expose reset tokens when DEMO_MODE is the string false", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await forgotPassword({
      request: jsonRequest({ email: "guest@example.com" }),
      env: {
        DB: createPasswordResetDb(),
        DEMO_MODE: "false",
      },
    } as never);
    const body = (await response.json()) as { ok?: boolean; demo_token?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.demo_token).toBeUndefined();
    expect(warning).toHaveBeenCalled();
  });

  it("exposes reset tokens only when demo mode is explicitly enabled", async () => {
    const response = await forgotPassword({
      request: jsonRequest({ email: "guest@example.com" }),
      env: {
        DB: createPasswordResetDb(),
        DEMO_MODE: "true",
      },
    } as never);
    const body = (await response.json()) as { demo_token?: string };

    expect(response.status).toBe(200);
    expect(body.demo_token).toMatch(/^[a-f0-9]{64}$/);
  });
});
