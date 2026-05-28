import { isAdminRequest } from "../../../_auth";
import { jsonResponse, badRequest, unauthorized, unavailable } from "../../../_responses";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

// ── PATCH /api/admin/merchandise/:id ──
export const onRequestPatch: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  const id = (context.params as Record<string, string>).id;
  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of [
    "name", "name_en", "name_ko", "name_ja",
    "description", "description_en", "description_ko", "description_ja",
    "category", "price_display", "available",
  ]) {
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if ("images" in body) {
    fields.push("images = ?");
    values.push(JSON.stringify(body.images));
  }

  if (fields.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  try {
    await context.env.DB.prepare(
      `update merchandise set ${fields.join(", ")} where id = ?`,
    ).bind(...values).run();

    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("更新失败", error, { route: `/api/admin/merchandise/${id}`, method: "PATCH" });
  }
};

// ── DELETE /api/admin/merchandise/:id ──
export const onRequestDelete: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  const id = (context.params as Record<string, string>).id;

  try {
    await context.env.DB.prepare(`delete from merchandise where id = ?`).bind(id).run();
    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("删除失败", error, { route: `/api/admin/merchandise/${id}`, method: "DELETE" });
  }
};
