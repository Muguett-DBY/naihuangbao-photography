import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { jsonResponse, badRequest, forbidden, unauthorized, unavailable } from "../../../_responses";
import { validateOptionalString, validateOptionalInt, validateOptionalEnum, validateUrl, validateId } from "../../../_validation";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

const workshopStatuses = ["upcoming", "ongoing", "completed", "cancelled"] as const;

const patchFieldValidators: Record<string, (v: unknown) => ReturnType<typeof validateOptionalString>> = {
  title: (v) => validateOptionalString(v, "活动标题", 200),
  title_en: (v) => validateOptionalString(v, "英文标题", 200),
  title_ko: (v) => validateOptionalString(v, "韩文标题", 200),
  title_ja: (v) => validateOptionalString(v, "日文标题", 200),
  description: (v) => validateOptionalString(v, "描述", 2000),
  description_en: (v) => validateOptionalString(v, "英文描述", 2000),
  description_ko: (v) => validateOptionalString(v, "韩文描述", 2000),
  description_ja: (v) => validateOptionalString(v, "日文描述", 2000),
  cover_image_url: (v) => validateUrl(v, "封面图片"),
  event_date: (v) => validateOptionalString(v, "活动日期"),
  event_time: (v) => validateOptionalString(v, "活动时间"),
  location: (v) => validateOptionalString(v, "地点", 200),
  max_participants: (v) => validateOptionalInt(v, "最大参与人数", 1),
  current_participants: (v) => validateOptionalInt(v, "当前参与人数", 0),
  price_display: (v) => validateOptionalString(v, "价格", 100),
  status: (v) => validateOptionalEnum(v, "状态", workshopStatuses),
  registration_form_url: (v) => validateUrl(v, "报名链接"),
};

// ── PATCH /api/admin/workshops/:id ──
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
      `update workshops set ${fields.join(", ")} where id = ?`,
    ).bind(...values).run();

    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("更新失败", error, { route: `/api/admin/workshops/${id}`, method: "PATCH" });
  }
};

// ── DELETE /api/admin/workshops/:id ──
export const onRequestDelete: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const id = (context.params as Record<string, string>).id;

  try {
    await context.env.DB.prepare(`delete from workshops where id = ?`).bind(id).run();
    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("删除失败", error, { route: `/api/admin/workshops/${id}`, method: "DELETE" });
  }
};
