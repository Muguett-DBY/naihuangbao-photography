export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    },
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
