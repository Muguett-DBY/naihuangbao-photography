import { isAdminRequest } from "../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../_responses";

type EnvWithDB = Env & { ADMIN_PASSWORD?: string; DB?: D1Database };

type ErrorReportRow = {
  id: string;
  message: string;
  category: string;
  source: string | null;
  url: string | null;
  user_agent: string | null;
  stack: string | null;
  metadata_json: string | null;
  status: "open" | "resolved" | "ignored";
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

const workflowStatuses = ["open", "resolved", "ignored"] as const;

export const onRequestGet: PagesFunction<EnvWithDB> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  const url = new URL(context.request.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") ?? 7)));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const requestedStatus = url.searchParams.get("status");
  const status = workflowStatuses.includes(requestedStatus as (typeof workflowStatuses)[number])
    ? requestedStatus as (typeof workflowStatuses)[number]
    : null;

  if (!context.env.DB) {
    return jsonResponse({ reports: [], total: 0, days, limit });
  }

  try {
    const statusClause = status ? " and status = ?" : "";
    const bindings = status ? [`-${days} days`, status, limit] : [`-${days} days`, limit];
    const rows = await context.env.DB.prepare(
      `select id, message, category, source, url, user_agent, stack, metadata_json,
              status, resolution_note, resolved_at, resolved_by, occurred_at, created_at, updated_at
       from client_error_reports
       where occurred_at >= datetime('now', ?)${statusClause}
       order by occurred_at desc
       limit ?`,
    )
      .bind(...bindings)
      .all<ErrorReportRow>();

    const reports = (rows.results ?? []).map((row) => ({
      id: row.id,
      message: row.message,
      category: row.category,
      source: row.source,
      url: row.url,
      userAgent: row.user_agent,
      stack: row.stack,
      metadata: parseMetadata(row.metadata_json),
      status: row.status || "open",
      resolutionNote: row.resolution_note,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return jsonResponse({ reports, total: reports.length, days, limit, status });
  } catch (error) {
    return unavailable("Failed to load client error reports", error, { route: "/api/admin/errors", method: "GET" });
  }
};

function parseMetadata(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
