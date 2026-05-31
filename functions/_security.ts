import { forbidden, jsonResponse } from "./_responses";

type RateLimitEnv = {
  DB?: D1Database;
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
    return { ok: true as const };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = nowSeconds - (nowSeconds % windowSeconds);
  const retryAfter = Math.max(1, windowStart + windowSeconds - nowSeconds);
  const ipHash = await hashClientIp(
    `${namespace}:${readClientIp(request)}`,
    env.RATE_LIMIT_SECRET ?? env.CHAT_RATE_LIMIT_SECRET ?? env.OPENCODE_GO_API_KEY ?? "nhb-rate-limit",
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

  const row = await env.DB.prepare(
    `select count
     from chat_rate_limits
     where ip_hash = ? and window_start = ?`,
  )
    .bind(ipHash, windowStart)
    .first<{ count: number }>();

  return Number(row?.count ?? 1) <= maxRequests
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

async function hashClientIp(value: string, secret: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(`${secret}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
