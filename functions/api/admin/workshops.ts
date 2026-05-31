import { isAdminMutationRequest, isAdminRequest } from "../../_auth";
import { jsonResponse, badRequest, forbidden, unauthorized, unavailable } from "../../_responses";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

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
  const title = (body.title as string)?.trim();
  const eventDate = (body.event_date as string)?.trim();

  if (!title || !eventDate) {
    return badRequest("请填写活动标题和日期");
  }

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
