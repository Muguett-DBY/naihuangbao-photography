import { jsonResponse, unavailable } from "../../_responses";
import { isAdminRequest } from "../../_auth";

type AuditLogRow = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_user: string;
  diff_json: string;
  created_at: string;
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MAX_SEARCH_LENGTH = 200;

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const num = parseInt(value ?? "", 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function isValidDate(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function buildSearchLike(search: string): { pattern: string; needsEscape: boolean } {
  const safe = search.slice(0, MAX_SEARCH_LENGTH).replace(/[\\%_]/g, "\\$&");
  return { pattern: `%${safe}%`, needsEscape: true };
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
}

/**
 * GET /api/admin/audit-log
 * Returns audit log entries with optional filtering, full-text search, and pagination.
 * Supports ?q=...&entity_type=...&action=...&from=ISO&to=ISO&limit=N&offset=N&format=json|csv
 * Requires admin authentication.
 */
export const onRequestGet: PagesFunction<Env & { ADMIN_PASSWORD?: string }> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const url = new URL(context.request.url);
    const limit = clampInt(url.searchParams.get("limit"), 1, MAX_LIMIT, DEFAULT_LIMIT);
    const offset = clampInt(url.searchParams.get("offset"), 0, 100000, 0);
    const entityType = url.searchParams.get("entity_type")?.trim() || null;
    const action = url.searchParams.get("action")?.trim() || null;
    const adminUser = url.searchParams.get("admin_user")?.trim() || null;
    const search = url.searchParams.get("q")?.trim() || null;
    const from = url.searchParams.get("from")?.trim() || null;
    const to = url.searchParams.get("to")?.trim() || null;
    const format = (url.searchParams.get("format") || "json").toLowerCase();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (entityType) {
      conditions.push("entity_type = ?");
      params.push(entityType);
    }
    if (action) {
      conditions.push("action = ?");
      params.push(action);
    }
    if (adminUser) {
      conditions.push("admin_user = ?");
      params.push(adminUser);
    }
    if (from && isValidDate(from)) {
      conditions.push("created_at >= ?");
      params.push(new Date(from).toISOString());
    }
    if (to && isValidDate(to)) {
      conditions.push("created_at <= ?");
      params.push(new Date(to).toISOString());
    }
    if (search) {
      const { pattern } = buildSearchLike(search);
      conditions.push("(entity_id LIKE ? ESCAPE '\\' OR admin_user LIKE ? ESCAPE '\\' OR diff_json LIKE ? ESCAPE '\\')");
      params.push(pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const baseQuery = `SELECT id, action, entity_type, entity_id, admin_user, diff_json, created_at FROM admin_audit_log${whereClause}`;

    const countQuery = `SELECT COUNT(*) as total FROM admin_audit_log${whereClause}`;
    const countResult = await context.env.DB.prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>();
    const total = countResult?.total ?? 0;

    const listQuery = `${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const result = await context.env.DB.prepare(listQuery)
      .bind(...params, limit, offset)
      .all<AuditLogRow>();

    const entries = (result.results ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      admin_user: row.admin_user,
      diff: JSON.parse(row.diff_json || "{}"),
      created_at: row.created_at,
    }));

    if (format === "csv") {
      const header = ["id", "created_at", "action", "entity_type", "entity_id", "admin_user", "diff"];
      const lines: string[] = [header.join(",")];
      for (const entry of entries) {
        lines.push([
          escapeCsvField(entry.id),
          escapeCsvField(entry.created_at),
          escapeCsvField(entry.action),
          escapeCsvField(entry.entity_type),
          escapeCsvField(entry.entity_id),
          escapeCsvField(entry.admin_user),
          escapeCsvField(JSON.stringify(entry.diff)),
        ].join(","));
      }
      return new Response(lines.join("\n"), {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return jsonResponse({
      entries,
      total,
      limit,
      offset,
      hasMore: offset + entries.length < total,
      filters: {
        entityType,
        action,
        adminUser,
        search,
        from,
        to,
      },
    });
  } catch (error) {
    return unavailable("Failed to load audit log", error, {
      route: "/api/admin/audit-log",
      method: "GET",
    });
  }
};
