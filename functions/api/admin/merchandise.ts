import { isAdminMutationRequest, isAdminRequest } from "../../_auth";
import { jsonResponse, badRequest, forbidden, unauthorized, unavailable } from "../../_responses";
import { validateString, validateOptionalString, validateOptionalEnum, validateBody } from "../../_validation";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

const merchCategories = ["prints", "albums", "frames", "accessories", "other"] as const;

// ── GET /api/admin/merchandise ──
export const onRequestGet: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  try {
    const result = await context.env.DB.prepare(`select * from merchandise order by created_at desc`).all();
    const items = result.results.map((r) => ({
      ...r,
      images: typeof r.images === "string" ? JSON.parse(r.images as string) : r.images,
    }));
    return jsonResponse({ merchandise: items });
  } catch (error) {
    return unavailable("加载失败", error, { route: "/api/admin/merchandise" });
  }
};

// ── POST /api/admin/merchandise ──
export const onRequestPost: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

  const validated = validateBody(body, {
    name: (v) => validateString(v, "产品名称"),
    name_en: (v) => validateOptionalString(v, "英文名称"),
    name_ko: (v) => validateOptionalString(v, "韩文名称"),
    name_ja: (v) => validateOptionalString(v, "日文名称"),
    description: (v) => validateOptionalString(v, "描述"),
    category: (v) => validateOptionalEnum(v, "分类", merchCategories),
    price_display: (v) => validateOptionalString(v, "价格"),
  });

  if (!validated.valid) {
    return badRequest(validated.error);
  }

  const name = (body.name as string)?.trim();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await context.env.DB.prepare(
      `insert into merchandise (id, name, name_en, name_ko, name_ja, description, description_en, description_ko, description_ja,
         images, category, price_display, available, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, name, body.name_en ?? "", body.name_ko ?? "", body.name_ja ?? "",
      body.description ?? "", body.description_en ?? "", body.description_ko ?? "", body.description_ja ?? "",
      JSON.stringify(body.images ?? []), body.category ?? "other",
      body.price_display ?? "", body.available ?? 1, now, now,
    ).run();

    return jsonResponse({ ok: true, id }, 201);
  } catch (error) {
    return unavailable("创建失败", error, { route: "/api/admin/merchandise", method: "POST" });
  }
};
