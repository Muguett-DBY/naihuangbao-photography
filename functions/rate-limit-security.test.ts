import { afterEach, describe, expect, it, vi } from "vitest";
import { enforcePublicChatRateLimit } from "./_chat";
import {
  enforceRateLimit,
  getRequiredRateLimitSecret,
  hashRateLimitKey,
} from "./_security";

function createRateLimitDb(options: {
  cleanupError?: Error;
  cleanupRun?: (attempt: number) => Promise<void>;
} = {}) {
  let insertedHash = "";
  const cleanupCutoffs: string[] = [];

  const prepare = vi.fn((query: string) => {
    const bound = {
      all: vi.fn(async () => ({ results: [] })),
      first: vi.fn(async () => null),
      run: vi.fn(async () => {
        if (query.includes("delete from chat_rate_limits") && options.cleanupError) {
          throw options.cleanupError;
        }
        if (query.includes("delete from chat_rate_limits")) {
          await options.cleanupRun?.(cleanupCutoffs.length);
        }
        return undefined;
      }),
    };
    const statement = {
      all: vi.fn(async () => ({ results: [] })),
      bind: vi.fn((...values: unknown[]) => {
        if (query.includes("insert into chat_rate_limits")) {
          insertedHash = String(values[0]);
        }
        if (query.includes("delete from chat_rate_limits")) {
          cleanupCutoffs.push(String(values[0]));
        }
        return bound;
      }),
    };
    return statement;
  });

  return {
    db: { prepare },
    getInsertedHash: () => insertedHash,
    getCleanupCutoffs: () => cleanupCutoffs,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rate-limit secret isolation", () => {
  const primarySecret = "primary-rate-limit-secret-with-32-characters";
  const legacySecret = "legacy-chat-rate-limit-secret-with-32-characters";

  it("prefers the shared dedicated secret and accepts the legacy dedicated secret", () => {
    expect(getRequiredRateLimitSecret({
      RATE_LIMIT_SECRET: `  ${primarySecret}  `,
      CHAT_RATE_LIMIT_SECRET: legacySecret,
    })).toBe(primarySecret);

    expect(getRequiredRateLimitSecret({
      RATE_LIMIT_SECRET: "too-short",
      CHAT_RATE_LIMIT_SECRET: legacySecret,
    })).toBe(legacySecret);
  });

  it.each([
    {},
    { RATE_LIMIT_SECRET: "too-short" },
    { RATE_LIMIT_SECRET: "   ", CHAT_RATE_LIMIT_SECRET: "also-too-short" },
  ])("rejects missing and weak dedicated secrets", (env) => {
    expect(getRequiredRateLimitSecret(env)).toBeNull();
  });

  it("pseudonymizes rate-limit keys with HMAC-SHA-256", async () => {
    const value = "booking-submit:203.0.113.7";
    const hmac = await hashRateLimitKey(value, primarySecret);
    const legacyPrefixedHash = await hashRateLimitKey(`${primarySecret}:${value}`);

    expect(hmac).toMatch(/^[a-f0-9]{64}$/);
    expect(hmac).not.toBe(legacyPrefixedHash);
    expect(await hashRateLimitKey(value, primarySecret)).toBe(hmac);
  });

  it("uses RATE_LIMIT_SECRET for shared public endpoint limits", async () => {
    const { db, getInsertedHash } = createRateLimitDb();
    const request = new Request("https://shoot.custard.top/api/booking", {
      headers: { "cf-connecting-ip": "203.0.113.7" },
    });

    await enforceRateLimit(request, {
      DB: db,
      RATE_LIMIT_SECRET: primarySecret,
      CHAT_RATE_LIMIT_SECRET: legacySecret,
    } as never, "booking-submit", 6, 3600);

    expect(getInsertedHash()).toBe(await hashRateLimitKey(
      "booking-submit:203.0.113.7",
      primarySecret,
    ));
  });

  it("removes shared rate-limit rows older than 24 hours", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-07-13T12:34:56.000Z"));
    const { db, getCleanupCutoffs } = createRateLimitDb();

    await enforceRateLimit(
      new Request("https://shoot.custard.top/api/booking"),
      { DB: db, RATE_LIMIT_SECRET: primarySecret } as never,
      "booking-submit",
      6,
      3600,
    );

    expect(getCleanupCutoffs()).toEqual(["2026-07-12T12:34:56.000Z"]);
  });

  it("prunes at most once per hour for the same database binding", async () => {
    const now = vi.spyOn(Date, "now");
    const { db, getCleanupCutoffs } = createRateLimitDb();
    const request = new Request("https://shoot.custard.top/api/booking");
    const env = { DB: db, RATE_LIMIT_SECRET: primarySecret } as never;

    now.mockReturnValue(Date.parse("2026-07-13T12:34:56.000Z"));
    await enforceRateLimit(request, env, "booking-submit", 6, 3600);
    now.mockReturnValue(Date.parse("2026-07-13T13:34:55.000Z"));
    await enforceRateLimit(request, env, "booking-submit", 6, 3600);

    expect(getCleanupCutoffs()).toEqual(["2026-07-12T12:34:56.000Z"]);
  });

  it("does not duplicate cleanup across concurrent requests", async () => {
    let releaseFirstCleanup!: () => void;
    const firstCleanup = new Promise<void>((resolve) => {
      releaseFirstCleanup = resolve;
    });
    const { db, getCleanupCutoffs } = createRateLimitDb({
      cleanupRun: (attempt) => attempt === 1 ? firstCleanup : Promise.resolve(),
    });
    const env = { DB: db, RATE_LIMIT_SECRET: primarySecret } as never;

    const firstRequest = enforceRateLimit(
      new Request("https://shoot.custard.top/api/booking"),
      env,
      "booking-submit",
      6,
      3600,
    );
    await vi.waitFor(() => expect(getCleanupCutoffs()).toHaveLength(1));

    try {
      await enforceRateLimit(
        new Request("https://shoot.custard.top/api/booking"),
        env,
        "booking-submit",
        6,
        3600,
      );
      expect(getCleanupCutoffs()).toHaveLength(1);
    } finally {
      releaseFirstCleanup();
      await firstRequest;
    }
  });

  it("keeps enforcing limits when stale-row cleanup fails", async () => {
    const cleanupError = new Error("cleanup unavailable");
    const { db } = createRateLimitDb({ cleanupError });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await enforceRateLimit(
      new Request("https://shoot.custard.top/api/booking"),
      { DB: db, RATE_LIMIT_SECRET: primarySecret } as never,
      "booking-submit",
      6,
      3600,
    );

    expect(result).toEqual({ ok: true });
    expect(warn).toHaveBeenCalledWith("Rate-limit cleanup failed", cleanupError);
  });

  it("retries failed cleanup after one minute", async () => {
    const now = vi.spyOn(Date, "now");
    const cleanupError = new Error("cleanup unavailable");
    const { db, getCleanupCutoffs } = createRateLimitDb({ cleanupError });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = new Request("https://shoot.custard.top/api/booking");
    const env = { DB: db, RATE_LIMIT_SECRET: primarySecret } as never;

    now.mockReturnValue(Date.parse("2026-07-13T12:34:56.000Z"));
    await enforceRateLimit(request, env, "booking-submit", 6, 3600);
    now.mockReturnValue(Date.parse("2026-07-13T12:35:55.000Z"));
    await enforceRateLimit(request, env, "booking-submit", 6, 3600);
    now.mockReturnValue(Date.parse("2026-07-13T12:35:56.000Z"));
    await enforceRateLimit(request, env, "booking-submit", 6, 3600);

    expect(getCleanupCutoffs()).toEqual([
      "2026-07-12T12:34:56.000Z",
      "2026-07-12T12:35:56.000Z",
    ]);
  });

  it("uses the same dedicated secret for public chat instead of the provider key", async () => {
    const { db, getInsertedHash } = createRateLimitDb();
    const request = new Request("https://shoot.custard.top/api/chat", {
      headers: { "cf-connecting-ip": "203.0.113.8" },
    });

    await enforcePublicChatRateLimit(request, {
      DB: db,
      RATE_LIMIT_SECRET: primarySecret,
      CHAT_RATE_LIMIT_SECRET: legacySecret,
      OPENCODE_GO_API_KEY: "provider-key-must-not-salt-rate-limits",
    });

    expect(getInsertedHash()).toBe(await hashRateLimitKey(
      "public-chat:203.0.113.8",
      primarySecret,
    ));
  });

  it("removes expired rate-limit rows for public chat", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-07-13T12:34:56.000Z"));
    const { db, getCleanupCutoffs } = createRateLimitDb();

    await enforcePublicChatRateLimit(
      new Request("https://shoot.custard.top/api/chat"),
      { DB: db, RATE_LIMIT_SECRET: primarySecret },
    );

    expect(getCleanupCutoffs()).toEqual(["2026-07-12T12:34:56.000Z"]);
  });
});
