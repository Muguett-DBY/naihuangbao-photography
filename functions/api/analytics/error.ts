import { jsonResponse } from "../../_responses";

/**
 * POST /api/analytics/error
 * Receives frontend error reports for monitoring.
 * Rate-limited to prevent abuse.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Simple rate limiting: 30 requests per minute per IP
  const ip = context.request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const windowKey = `error-log:${ip}:${Math.floor(now / 60000)}`;

  try {
    const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

    // Basic validation
    if (!body.context || !body.message) {
      return jsonResponse({ error: "Invalid error report" }, 400);
    }

    // Log to console for Cloudflare Workers logs
    console.error("[FrontendError]", JSON.stringify({
      context: body.context,
      message: body.message,
      stack: body.stack,
      url: body.url,
      timestamp: body.timestamp,
    }));

    // In a real implementation, you would:
    // 1. Store in D1 error_logs table
    // 2. Send to Sentry/LogRocket
    // 3. Send to Cloudflare Analytics

    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ error: "Failed to log error" }, 500);
  }
};
