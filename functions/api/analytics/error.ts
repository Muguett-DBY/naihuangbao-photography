import { jsonResponse } from "../../_responses";
import { enforceRateLimit, rateLimited } from "../../_security";

/**
 * POST /api/analytics/error
 * Receives frontend error reports for monitoring.
 * Rate-limited to prevent abuse.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const limit = await enforceRateLimit(context.request, context.env, "analytics-error", 30, 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  try {
    const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

    // Basic validation
    if (!body.context || !body.message) {
      return jsonResponse({ error: "Invalid error report" }, 400);
    }

    // Truncate fields to prevent log amplification
    const ctx = String(body.context).slice(0, 500);
    const msg = String(body.message).slice(0, 500);

    // Log to console for Cloudflare Workers logs
    console.error("[FrontendError]", JSON.stringify({ context: ctx, message: msg }));

    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ error: "Failed to log error" }, 500);
  }
};
