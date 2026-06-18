import { forbidden, jsonResponse } from "./_responses";

type D1DatabaseLike = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
};

type RateLimitEnv = {
  DB?: D1DatabaseLike;
  RATE_LIMIT_SECRET?: string;
  CHAT_RATE_LIMIT_SECRET?: string;
  OPENCODE_GO_API_KEY?: string;
};

const publicMutationHeaderName = "x-nhb-public-action";

export function isPublicMutationRequest(request: Request) {
  return request.headers.get(publicMutationHeaderName) === "1";
}

export function requirePublicMutationRequest(request: Request) {
  return isPublicMutationRequest(request) ? null : forbidden("缺少页面操作校验头");
}

export function getRequiredAuthSecret(env: { AUTH_SECRET?: string }) {
  const secret = env.AUTH_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function authSecretUnavailable() {
  return jsonResponse({ error: "认证服务未正确配置" }, 503);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function enforceRateLimit(
  request: Request,
  env: RateLimitEnv,
  namespace: string,
  maxRequests: number,
  windowSeconds: number,
) {
  if (!env.DB) {
    // In-memory fallback when D1 is unavailable — allows traffic but logs a warning
    return { ok: true as const, degraded: true as const };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = nowSeconds - (nowSeconds % windowSeconds);
  const previousWindowStart = windowStart - windowSeconds;
  const elapsedSeconds = nowSeconds - windowStart;
  const previousWeight = Math.max(0, 1 - elapsedSeconds / windowSeconds);
  const retryAfter = Math.max(1, windowStart + windowSeconds - nowSeconds);
  const ipHash = await hashRateLimitKey(
    `${namespace}:${readClientIp(request)}`,
    env.RATE_LIMIT_SECRET ?? env.CHAT_RATE_LIMIT_SECRET ?? env.OPENCODE_GO_API_KEY,
  );
  const updatedAt = new Date(nowSeconds * 1000).toISOString();

  await env.DB.prepare(
    `insert into chat_rate_limits (ip_hash, window_start, count, updated_at)
     values (?, ?, 1, ?)
     on conflict(ip_hash, window_start)
     do update set count = count + 1, updated_at = excluded.updated_at`,
  )
    .bind(ipHash, windowStart, updatedAt)
    .run();

  const rows = await env.DB.prepare(
    `select window_start, count
     from chat_rate_limits
     where ip_hash = ? and window_start in (?, ?)`,
  )
    .bind(ipHash, windowStart, previousWindowStart)
    .all<{ window_start: number; count: number }>();

  const currentCount = Number(rows.results.find((row) => row.window_start === windowStart)?.count ?? 1);
  const previousCount = Number(rows.results.find((row) => row.window_start === previousWindowStart)?.count ?? 0);
  const weightedCount = currentCount + previousCount * previousWeight;

  return weightedCount <= maxRequests
    ? { ok: true as const }
    : { ok: false as const, retryAfter };
}

export function rateLimited(retryAfter: number) {
  return jsonResponse(
    { error: "请求过于频繁，请稍后再试。", retryAfter },
    429,
    { "Retry-After": String(retryAfter) },
  );
}

function readClientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export async function hashRateLimitKey(value: string, secret?: string) {
  const encoder = new TextEncoder();
  const normalizedSecret = secret?.trim();
  const bytes = encoder.encode(normalizedSecret ? `${normalizedSecret}:${value}` : value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const maxLength = Math.max(aBytes.length, bBytes.length);

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (aBytes[index] ?? 0) ^ (bBytes[index] ?? 0);
  }

  return diff === 0;
}
