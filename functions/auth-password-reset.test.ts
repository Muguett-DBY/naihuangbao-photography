import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost as forgotPassword } from "./api/auth/forgot-password";
import { onRequestPost as resetPassword } from "./api/auth/reset-password";

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

  it("rejects uniformly before database access when email delivery is unavailable", async () => {
    const db = createPasswordResetDb();
    const response = await forgotPassword({
      request: jsonRequest({ email: "guest@example.com" }),
      env: {
        DB: db,
        DEMO_MODE: "false",
      },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("email_delivery_unavailable");
    expect(db.prepare).not.toHaveBeenCalledWith(expect.stringContaining("from users"));
    expect(db.prepare).not.toHaveBeenCalledWith(expect.stringContaining("password_reset_tokens"));
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

describe("password reset token claims", () => {
  it("allows only one password update for a reset token", async () => {
    let claimed = false;
    let passwordUpdates = 0;
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: vi.fn(() => statement),
          all: vi.fn(async () => ({ results: [] })),
          first: vi.fn(async () => {
            if (sql.includes("from password_reset_tokens")) {
              return { id: "reset-1", user_id: "user-1", expires_at: "2099-01-01T00:00:00.000Z" };
            }
            if (sql.includes("from users")) return { id: "user-1" };
            if (sql.includes("update password_reset_tokens")) {
              if (claimed) return null;
              claimed = true;
              return { user_id: "user-1" };
            }
            return null;
          }),
          run: vi.fn(async () => {
            if (sql.includes("update users")) passwordUpdates += 1;
            return { success: true };
          }),
        };
        return statement;
      }),
    };
    const request = () => new Request("https://shoot.custard.top/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
      body: JSON.stringify({ token: "valid-reset-token", newPassword: "new-password-123" }),
    });

    const first = await resetPassword({ request: request(), env: { DB: db } } as never);
    const second = await resetPassword({ request: request(), env: { DB: db } } as never);

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(passwordUpdates).toBe(1);
  });
});
