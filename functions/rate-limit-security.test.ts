import { describe, expect, it, vi } from "vitest";
import { enforcePublicChatRateLimit } from "./_chat";
import {
  enforceRateLimit,
  getRequiredRateLimitSecret,
  hashRateLimitKey,
} from "./_security";

function createRateLimitDb() {
  let insertedHash = "";

  const prepare = vi.fn((query: string) => {
    const bound = {
      all: vi.fn(async () => ({ results: [] })),
      first: vi.fn(async () => null),
      run: vi.fn(async () => undefined),
    };
    const statement = {
      all: vi.fn(async () => ({ results: [] })),
      bind: vi.fn((...values: unknown[]) => {
        if (query.includes("insert into chat_rate_limits")) {
          insertedHash = String(values[0]);
        }
        return bound;
      }),
    };
    return statement;
  });

  return {
    db: { prepare },
    getInsertedHash: () => insertedHash,
  };
}

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
});
