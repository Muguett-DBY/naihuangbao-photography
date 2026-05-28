import { isAdminRequest } from "../../../_auth";
import { jsonResponse, badRequest, unauthorized, unavailable } from "../../../_responses";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

// ── PATCH /api/admin/courses/:id ──
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
    "title", "title_en", "title_ko", "title_ja",
    "description", "description_en", "description_ko", "description_ja",
    "cover_image_url", "video_url", "content_markdown",
    "category", "difficulty", "duration_minutes", "sort_order", "published",
  ]) {
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  try {
    await context.env.DB.prepare(
      `update courses set ${fields.join(", ")} where id = ?`,
    ).bind(...values).run();

    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("更新失败", error, { route: `/api/admin/courses/${id}`, method: "PATCH" });
  }
};

// ── DELETE /api/admin/courses/:id ──
export const onRequestDelete: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  const id = (context.params as Record<string, string>).id;

  try {
    await context.env.DB.prepare(`delete from courses where id = ?`).bind(id).run();
    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("删除失败", error, { route: `/api/admin/courses/${id}`, method: "DELETE" });
  }
};
