import { isAdminRequest } from "../../_auth";
import { jsonResponse, badRequest, unauthorized, unavailable } from "../../_responses";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

// ── GET /api/admin/presets ──
export const onRequestGet: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  try {
    const result = await context.env.DB.prepare(`select * from presets order by created_at desc`).all();
    const presets = result.results.map((r) => ({
      ...r,
      preview_images: typeof r.preview_images === "string" ? JSON.parse(r.preview_images as string) : r.preview_images,
    }));
    return jsonResponse({ presets });
  } catch (error) {
    return unavailable("加载失败", error, { route: "/api/admin/presets" });
  }
};

// ── POST /api/admin/presets ──
export const onRequestPost: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = (body.name as string)?.trim();

  if (!name) {
    return badRequest("请填写预设名称");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await context.env.DB.prepare(
      `insert into presets (id, name, name_en, name_ko, name_ja, description, description_en, description_ko, description_ja,
         category, preview_images, download_url, price_display, featured, download_count, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, name, body.name_en ?? "", body.name_ko ?? "", body.name_ja ?? "",
      body.description ?? "", body.description_en ?? "", body.description_ko ?? "", body.description_ja ?? "",
      body.category ?? "lightroom", JSON.stringify(body.preview_images ?? []),
      body.download_url ?? "", body.price_display ?? "", body.featured ?? 0, 0, now, now,
    ).run();

    return jsonResponse({ ok: true, id }, 201);
  } catch (error) {
    return unavailable("创建失败", error, { route: "/api/admin/presets", method: "POST" });
  }
};
