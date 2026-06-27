import { jsonResponse } from "../../_responses";
import { enforceRateLimit, rateLimited } from "../../_security";

type EnvWithDB = Env & { DB?: D1Database };

/**
 * POST /api/analytics/error
 * Receives frontend error reports for monitoring.
 * Rate-limited to prevent abuse.
 */
export const onRequestPost: PagesFunction<EnvWithDB> = async (context) => {
  const limit = await enforceRateLimit(context.request, context.env, "analytics-error", 30, 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  try {
    const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

    const message = textField(body.message, 500);
    if (!message) {
      return jsonResponse({ error: "Invalid error report" }, 400);
    }

    const report = {
      id: textField(body.id, 96) || `err_${crypto.randomUUID()}`,
      message,
      category: normalizeCategory(body.category),
      source: textField(body.source ?? body.context, 500),
      url: textField(body.url, 500),
      userAgent: textField(body.userAgent, 500),
      stack: textField(body.stack, 2000),
      metadataJson: safeJson(body.metadata ?? extractLegacyMetadata(body)),
      occurredAt: textField(body.timestamp, 64) || new Date().toISOString(),
    };

    if (context.env.DB) {
      await context.env.DB.prepare(
        `insert into client_error_reports
          (id, message, category, source, url, user_agent, stack, metadata_json, occurred_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
          message = excluded.message,
          category = excluded.category,
          source = excluded.source,
          url = excluded.url,
          user_agent = excluded.user_agent,
          stack = excluded.stack,
          metadata_json = excluded.metadata_json,
          occurred_at = excluded.occurred_at`,
      )
        .bind(
          report.id,
          report.message,
          report.category,
          report.source,
          report.url,
          report.userAgent,
          report.stack,
          report.metadataJson,
          report.occurredAt,
        )
        .run();
    } else {
      console.error("[FrontendError]", JSON.stringify({ source: report.source, message: report.message }));
    }

    return jsonResponse({ ok: true, stored: Boolean(context.env.DB) }, 200);
  } catch {
    return jsonResponse({ error: "Failed to log error" }, 500);
  }
};

function textField(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeCategory(value: unknown) {
  const category = textField(value, 32);
  return ["javascript", "promise", "react", "resource", "manual"].includes(category) ? category : "manual";
}

function safeJson(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  try {
    return JSON.stringify(value).slice(0, 2000);
  } catch {
    return "{}";
  }
}

function extractLegacyMetadata(body: Record<string, unknown>) {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!["id", "message", "category", "source", "context", "url", "userAgent", "stack", "timestamp", "metadata"].includes(key)) {
      metadata[key] = value;
    }
  }
  return metadata;
}
