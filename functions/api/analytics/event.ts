import { jsonResponse } from "../../_responses";
import { enforceRateLimit, rateLimited } from "../../_security";

/**
 * POST /api/analytics/event
 * Receives batched custom event reports (track()) from client.
 * Public, rate-limited. Stores raw events in D1.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const limit = await enforceRateLimit(context.request, context.env, "analytics-event", 30, 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  try {
    const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
    const events = Array.isArray(body.events) ? body.events : [];

    if (events.length === 0) {
      return jsonResponse({ ok: true, inserted: 0 }, 200);
    }
    if (events.length > 10) {
      return jsonResponse({ error: "Too many events in one batch (max 10)" }, 400);
    }

    const db = context.env.DB;
    if (!db) {
      return jsonResponse({ ok: true, inserted: 0, degraded: true }, 200);
    }

    const stmt = db.prepare(
      `insert into custom_events (event, session_id, metadata_json, page, created_at)
       values (?, ?, ?, ?, datetime('now'))`,
    );

    let inserted = 0;
    for (const raw of events) {
      const e = raw as Record<string, unknown>;
      const eventName = String(e.event ?? "").slice(0, 64);
      const sessionId = String(e.sessionId ?? "").slice(0, 64);
      const metadata = e.metadata && typeof e.metadata === "object" ? JSON.stringify(e.metadata).slice(0, 2000) : "{}";
      const page = e.page ? String(e.page).slice(0, 200) : "";
      if (!eventName) continue;
      await stmt.bind(eventName, sessionId, metadata, page).run();
      inserted += 1;
    }

    return jsonResponse({ ok: true, inserted }, 200);
  } catch {
    return jsonResponse({ error: "Failed to record events" }, 500);
  }
};
