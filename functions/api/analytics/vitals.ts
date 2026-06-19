import { jsonResponse } from "../../_responses";
import { enforceRateLimit, rateLimited } from "../../_security";

/**
 * POST /api/analytics/vitals
 * Receives Web Vitals metric reports (LCP, INP, CLS, FCP, TTFB) from client.
 * Rate-limited to prevent abuse.
 * Public endpoint (no auth) — accepts anonymous, low-volume telemetry.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const limit = await enforceRateLimit(context.request, context.env, "analytics-vitals", 60, 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  try {
    const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
    const metrics = Array.isArray(body.metrics) ? body.metrics : [];

    if (metrics.length === 0) {
      return jsonResponse({ error: "No metrics provided" }, 400);
    }

    if (metrics.length > 20) {
      return jsonResponse({ error: "Too many metrics in one batch (max 20)" }, 400);
    }

    const db = context.env.DB;
    if (!db) {
      return jsonResponse({ ok: true, degraded: true }, 200);
    }

    const allowedMetrics = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
    const allowedRatings = new Set(["good", "needs-improvement", "poor"]);

    const stmt = db.prepare(
      `insert into web_vitals (metric, value, rating, page, connection_type, created_at)
       values (?, ?, ?, ?, ?, datetime('now'))`,
    );

    let inserted = 0;
    for (const raw of metrics) {
      const m = raw as Record<string, unknown>;
      const metric = String(m.metric ?? "");
      const value = Number(m.value);
      const rating = String(m.rating ?? "");
      const page = String(m.page ?? "").slice(0, 200);
      const connectionType = m.connectionType ? String(m.connectionType).slice(0, 32) : null;

      if (!allowedMetrics.has(metric)) continue;
      if (!Number.isFinite(value) || value < 0) continue;
      if (!allowedRatings.has(rating)) continue;
      if (!page) continue;

      await stmt.bind(metric, value, rating, page, connectionType).run();
      inserted += 1;
    }

    return jsonResponse({ ok: true, inserted }, 200);
  } catch {
    return jsonResponse({ error: "Failed to record vitals" }, 500);
  }
};
