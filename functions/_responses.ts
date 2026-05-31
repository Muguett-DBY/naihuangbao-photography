export const apiSecurityHeaders: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

export function withSecurityHeaders(headers: HeadersInit = {}) {
  const next = new Headers(headers);
  for (const [key, value] of Object.entries(apiSecurityHeaders)) {
    if (!next.has(key)) next.set(key, value);
  }
  return next;
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withSecurityHeaders({
      "content-type": "application/json; charset=utf-8",
      ...headers,
    }),
  });
}

export function badRequest(message: string) {
  return jsonResponse({ error: message }, 400);
}

export function unauthorized(message = "请先登录后台") {
  return jsonResponse({ error: message }, 401);
}

export function forbidden(message = "请求被拒绝") {
  return jsonResponse({ error: message }, 403);
}

export function unavailable(message: string, error: unknown, context: Record<string, string> = {}) {
  logWorkerError(message, error, context);
  return jsonResponse({ error: message }, 503);
}

export function logWorkerError(message: string, error: unknown, context: Record<string, string> = {}) {
  console.warn(JSON.stringify({
    level: "warn",
    message,
    error: error instanceof Error ? error.message : "unknown",
    ...context,
  }));
}
