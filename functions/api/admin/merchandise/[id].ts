import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { jsonResponse, badRequest, forbidden, unauthorized, unavailable } from "../../../_responses";
import { validateOptionalString, validateOptionalEnum, validateId } from "../../../_validation";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

const merchCategories = ["prints", "albums", "frames", "accessories", "other"] as const;

const patchFieldValidators: Record<string, (v: unknown) => ReturnType<typeof validateOptionalString>> = {
  name: (v) => validateOptionalString(v, "产品名称", 200),
  name_en: (v) => validateOptionalString(v, "英文名称", 200),
  name_ko: (v) => validateOptionalString(v, "韩文名称", 200),
  name_ja: (v) => validateOptionalString(v, "日文名称", 200),
  description: (v) => validateOptionalString(v, "描述", 2000),
  description_en: (v) => validateOptionalString(v, "英文描述", 2000),
  description_ko: (v) => validateOptionalString(v, "韩文描述", 2000),
  description_ja: (v) => validateOptionalString(v, "日文描述", 2000),
  category: (v) => validateOptionalEnum(v, "分类", merchCategories),
  price_display: (v) => validateOptionalString(v, "价格", 100),
  available: (v) => { if (v === 0 || v === 1) return { valid: true } as const; return { valid: false, error: "库存状态格式不正确" } as const; },
};

// ── PATCH /api/admin/merchandise/:id ──
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
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const id = (context.params as Record<string, string>).id;

  try {
    await context.env.DB.prepare(`delete from merchandise where id = ?`).bind(id).run();
    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("删除失败", error, { route: `/api/admin/merchandise/${id}`, method: "DELETE" });
  }
};
