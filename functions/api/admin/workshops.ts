import { isAdminMutationRequest, isAdminRequest } from "../../_auth";
import { jsonResponse, badRequest, forbidden, unauthorized, unavailable } from "../../_responses";
import { validateString, validateOptionalString, validateOptionalInt, validateEnum, validateOptionalEnum, validateUrl, validateBody } from "../../_validation";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

const workshopStatuses = ["upcoming", "ongoing", "completed", "cancelled"] as const;

// ── GET /api/admin/workshops ──
export const onRequestGet: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  try {
    const result = await context.env.DB.prepare(
      `select * from workshops order by event_date desc`,
    ).all();
    return jsonResponse({ workshops: result.results });
  } catch (error) {
    return unavailable("加载失败", error, { route: "/api/admin/workshops" });
  }
};

// ── POST /api/admin/workshops ──
export const onRequestPost: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

  const validated = validateBody(body, {
    title: (v) => validateString(v, "活动标题"),
    event_date: (v) => validateString(v, "活动日期"),
    title_en: (v) => validateOptionalString(v, "英文标题"),
    title_ko: (v) => validateOptionalString(v, "韩文标题"),
    title_ja: (v) => validateOptionalString(v, "日文标题"),
    description: (v) => validateOptionalString(v, "描述"),
    location: (v) => validateOptionalString(v, "地点"),
    max_participants: (v) => validateOptionalInt(v, "最大参与人数", 1),
    price_display: (v) => validateOptionalString(v, "价格"),
    status: (v) => validateOptionalEnum(v, "状态", workshopStatuses),
    cover_image_url: (v) => validateUrl(v, "封面图片"),
    registration_form_url: (v) => validateUrl(v, "报名链接"),
  });

  if (!validated.valid) {
    return badRequest(validated.error);
  }

  const title = (body.title as string)?.trim();
  const eventDate = (body.event_date as string)?.trim();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await context.env.DB.prepare(
      `insert into workshops (id, title, title_en, title_ko, title_ja, description, description_en, description_ko, description_ja,
         cover_image_url, event_date, event_time, location, max_participants, current_participants,
         price_display, status, registration_form_url, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, title, body.title_en ?? "", body.title_ko ?? "", body.title_ja ?? "",
      body.description ?? "", body.description_en ?? "", body.description_ko ?? "", body.description_ja ?? "",
      body.cover_image_url ?? "", eventDate, body.event_time ?? "", body.location ?? "",
      body.max_participants ?? 0, 0, body.price_display ?? "",
      body.status ?? "upcoming", body.registration_form_url ?? "", now, now,
    ).run();

    return jsonResponse({ ok: true, id }, 201);
  } catch (error) {
    return unavailable("创建失败", error, { route: "/api/admin/workshops", method: "POST" });
  }
};
