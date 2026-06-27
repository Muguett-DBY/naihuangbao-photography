import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { badRequest, forbidden, jsonResponse, unauthorized, unavailable } from "../../../_responses";
import { validateEnum, validateId, validateOptionalString } from "../../../_validation";

type ErrorWorkflowEnv = Env & { ADMIN_PASSWORD?: string; DB?: D1Database };

const workflowStatuses = ["open", "resolved", "ignored"] as const;
const workflowScopes = ["single", "group"] as const;

export const onRequestPatch: PagesFunction<ErrorWorkflowEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) return unauthorized();
  if (!isAdminMutationRequest(context.request)) return forbidden("缺少后台操作校验头");

  const id = (context.params as Record<string, string>).id;
  const idCheck = validateId(id);
  if (!idCheck.valid) return badRequest(idCheck.error);

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
  const statusCheck = validateEnum(body.status, "状态", workflowStatuses);
  if (!statusCheck.valid) return badRequest(statusCheck.error);
  const scopeCheck = validateEnum(body.scope ?? "single", "处理范围", workflowScopes);
  if (!scopeCheck.valid) return badRequest(scopeCheck.error);
  const noteCheck = validateOptionalString(body.note, "处理备注", 1000);
  if (!noteCheck.valid) return badRequest(noteCheck.error);
  if (!context.env.DB) {
    return unavailable("Client error workflow unavailable", undefined, {
      route: `/api/admin/errors/${id}`,
      method: "PATCH",
    });
  }

  const status = body.status as (typeof workflowStatuses)[number];
  const scope = body.scope === "group" ? "group" : "single";
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const resolvedBy = status === "open"
    ? null
    : context.request.headers.get("cf-access-authenticated-user-email")?.trim() || "admin";
  const resolvedAtSql = status === "open" ? "null" : "datetime('now')";

  try {
    const result = scope === "group"
      ? await updateErrorGroup(context.env.DB, id, status, note, resolvedBy, resolvedAtSql)
      : await context.env.DB.prepare(
        `update client_error_reports
         set status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ${resolvedAtSql}, updated_at = datetime('now')
         where id = ?`,
      ).bind(status, note, resolvedBy, id).run();

    return jsonResponse({ ok: true, id, status, note, scope, updated: result.meta?.changes ?? 1 });
  } catch (error) {
    return unavailable("Failed to update client error report", error, {
      route: `/api/admin/errors/${id}`,
      method: "PATCH",
    });
  }
};

async function updateErrorGroup(
  db: D1Database,
  id: string,
  status: (typeof workflowStatuses)[number],
  note: string | null,
  resolvedBy: string | null,
  resolvedAtSql: string,
) {
  const seed = await db.prepare(
    `select message, category, source, url
     from client_error_reports
     where id = ?`,
  ).bind(id).first<{ message: string; category: string; source: string | null; url: string | null }>();

  if (!seed) throw new Error("Client error report not found");

  const groupStatusClause = status === "open" ? "where status != 'open'" : "where status = 'open'";
  return db.prepare(
    `update client_error_reports
     set status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ${resolvedAtSql}, updated_at = datetime('now')
     ${groupStatusClause}
       and category = ?
       and message = ?
       and coalesce(source, '') = ?
       and coalesce(url, '') = ?`,
  ).bind(status, note, resolvedBy, seed.category, seed.message, seed.source ?? "", seed.url ?? "").run();
}
