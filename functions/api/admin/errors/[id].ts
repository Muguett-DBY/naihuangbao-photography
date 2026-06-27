import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { badRequest, forbidden, jsonResponse, unauthorized, unavailable } from "../../../_responses";
import { validateEnum, validateId, validateOptionalString } from "../../../_validation";

type ErrorWorkflowEnv = Env & { ADMIN_PASSWORD?: string; DB?: D1Database };

const workflowStatuses = ["open", "resolved", "ignored"] as const;

export const onRequestPatch: PagesFunction<ErrorWorkflowEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) return unauthorized();
  if (!isAdminMutationRequest(context.request)) return forbidden("缺少后台操作校验头");

  const id = (context.params as Record<string, string>).id;
  const idCheck = validateId(id);
  if (!idCheck.valid) return badRequest(idCheck.error);

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
  const statusCheck = validateEnum(body.status, "状态", workflowStatuses);
  if (!statusCheck.valid) return badRequest(statusCheck.error);
  const noteCheck = validateOptionalString(body.note, "处理备注", 1000);
  if (!noteCheck.valid) return badRequest(noteCheck.error);
  if (!context.env.DB) {
    return unavailable("Client error workflow unavailable", undefined, {
      route: `/api/admin/errors/${id}`,
      method: "PATCH",
    });
  }

  const status = body.status as (typeof workflowStatuses)[number];
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const resolvedBy = status === "open"
    ? null
    : context.request.headers.get("cf-access-authenticated-user-email")?.trim() || "admin";
  const resolvedAtSql = status === "open" ? "null" : "datetime('now')";

  try {
    await context.env.DB.prepare(
      `update client_error_reports
       set status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ${resolvedAtSql}, updated_at = datetime('now')
       where id = ?`,
    ).bind(status, note, resolvedBy, id).run();

    return jsonResponse({ ok: true, id, status, note });
  } catch (error) {
    return unavailable("Failed to update client error report", error, {
      route: `/api/admin/errors/${id}`,
      method: "PATCH",
    });
  }
};
