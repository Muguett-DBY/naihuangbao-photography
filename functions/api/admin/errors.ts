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
const MAX_GROUPING_SCAN = 500;

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
    return jsonResponse({ reports: [], total: 0, reportedTotal: 0, days, limit });
  }

  try {
    const fetchLimit = Math.min(MAX_GROUPING_SCAN, Math.max(limit, limit * 5));
    const statusClause = status ? " and status = ?" : "";
    const bindings = status ? [`-${days} days`, status, fetchLimit] : [`-${days} days`, fetchLimit];
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

    const reports = groupReports(rows.results ?? []).slice(0, limit);

    return jsonResponse({
      reports,
      total: reports.length,
      reportedTotal: rows.results?.length ?? 0,
      days,
      limit,
      status,
    });
  } catch (error) {
    return unavailable("Failed to load client error reports", error, { route: "/api/admin/errors", method: "GET" });
  }
};

function groupReports(rows: ErrorReportRow[]) {
  const groups = new Map<string, ReturnType<typeof mapReportRow>>();

  for (const row of rows) {
    const groupKey = groupKeyForRow(row);
    const report = mapReportRow(row, groupKey);
    const existing = groups.get(groupKey);

    if (!existing) {
      groups.set(groupKey, report);
      continue;
    }

    existing.occurrenceCount += 1;
    if (new Date(row.occurred_at).getTime() > new Date(existing.latestOccurredAt).getTime()) {
      Object.assign(existing, {
        ...report,
        occurrenceCount: existing.occurrenceCount,
        firstOccurredAt: existing.firstOccurredAt,
      });
    } else if (new Date(row.occurred_at).getTime() < new Date(existing.firstOccurredAt).getTime()) {
      existing.firstOccurredAt = row.occurred_at;
    }
  }

  return Array.from(groups.values());
}

function mapReportRow(row: ErrorReportRow, groupKey: string) {
  return {
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
      latestOccurredAt: row.occurred_at,
      firstOccurredAt: row.occurred_at,
      occurrenceCount: 1,
      groupKey,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
  };
}

function parseMetadata(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function groupKeyForRow(row: ErrorReportRow) {
  return [
    normalizeGroupPart(row.category),
    normalizeGroupPart(row.message),
    normalizeGroupPart(row.source),
    normalizeGroupPart(row.url),
  ].join("|");
}

function normalizeGroupPart(value: string | null) {
  return (value || "-").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}
