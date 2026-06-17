import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { jsonResponse, badRequest, forbidden, unauthorized, unavailable } from "../../../_responses";
import { validateOptionalString, validateOptionalInt, validateOptionalEnum, validateUrl, validateId } from "../../../_validation";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

const courseCategories = ["beginner", "intermediate", "advanced", "lightroom", "posing", "business"] as const;
const courseDifficulties = ["beginner", "intermediate", "advanced"] as const;

const patchFieldValidators: Record<string, (v: unknown) => ReturnType<typeof validateOptionalString>> = {
  title: (v) => validateOptionalString(v, "课程标题", 200),
  title_en: (v) => validateOptionalString(v, "英文标题", 200),
  title_ko: (v) => validateOptionalString(v, "韩文标题", 200),
  title_ja: (v) => validateOptionalString(v, "日文标题", 200),
  description: (v) => validateOptionalString(v, "描述", 2000),
  description_en: (v) => validateOptionalString(v, "英文描述", 2000),
  description_ko: (v) => validateOptionalString(v, "韩文描述", 2000),
  description_ja: (v) => validateOptionalString(v, "日文描述", 2000),
  cover_image_url: (v) => validateUrl(v, "封面图片"),
  video_url: (v) => validateUrl(v, "视频"),
  content_markdown: (v) => validateOptionalString(v, "内容", 50000),
  category: (v) => validateOptionalEnum(v, "分类", courseCategories),
  difficulty: (v) => validateOptionalEnum(v, "难度", courseDifficulties),
  duration_minutes: (v) => validateOptionalInt(v, "时长(分钟)", 0),
  sort_order: (v) => validateOptionalInt(v, "排序"),
  published: (v) => { if (v === 0 || v === 1) return { valid: true } as const; return { valid: false, error: "发布状态格式不正确" } as const; },
};

// ── PATCH /api/admin/courses/:id ──
export const onRequestPatch: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const id = (context.params as Record<string, string>).id;
  const idCheck = validateId(id);
  if (!idCheck.valid) return badRequest(idCheck.error);

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of Object.keys(patchFieldValidators)) {
    if (key in body) {
      const check = patchFieldValidators[key](body[key]);
      if (!check.valid) return badRequest(check.error);
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
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const id = (context.params as Record<string, string>).id;

  try {
    await context.env.DB.prepare(`delete from courses where id = ?`).bind(id).run();
    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("删除失败", error, { route: `/api/admin/courses/${id}`, method: "DELETE" });
  }
};
