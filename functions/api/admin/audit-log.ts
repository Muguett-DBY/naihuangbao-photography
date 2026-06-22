import { jsonResponse } from "../../_responses";
import { isAdminRequest } from "../../_auth";
import { unavailable } from "../../_responses";

type AuditLogRow = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_user: string;
  diff_json: string;
  created_at: string;
};

/**
 * GET /api/admin/audit-log
 * Returns audit log entries with optional filtering.
 * Requires admin authentication.
 */
export const onRequestGet: PagesFunction<Env & { ADMIN_PASSWORD?: string }> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const url = new URL(context.request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
    const entityType = url.searchParams.get("entity_type");
    const action = url.searchParams.get("action");

    let query = "SELECT * FROM admin_audit_log";
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (entityType) {
      conditions.push("entity_type = ?");
      params.push(entityType);
    }
    if (action) {
      conditions.push("action = ?");
      params.push(action);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const result = await context.env.DB.prepare(query)
      .bind(...params)
      .all<AuditLogRow>();

    const entries = (result.results ?? []).map((row) => ({
      ...row,
      diff: JSON.parse(row.diff_json || "{}"),
    }));

    return jsonResponse({
      entries,
      limit,
      offset,
    });
  } catch (error) {
    return unavailable("Failed to load audit log", error, {
      route: "/api/admin/audit-log",
      method: "GET",
    });
  }
};
