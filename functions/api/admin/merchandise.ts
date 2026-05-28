import { isAdminRequest } from "../../_auth";
import { jsonResponse, badRequest, unauthorized, unavailable } from "../../_responses";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

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

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = (body.name as string)?.trim();

  if (!name) {
    return badRequest("请填写产品名称");
  }

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
