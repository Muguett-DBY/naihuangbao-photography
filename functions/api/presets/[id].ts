import { jsonResponse } from "../../_responses";

// ── Public: GET /api/presets/:id ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "服务不可用" }, 503);
  }

  const id = (context.params as Record<string, string>).id;

  try {
    const preset = await context.env.DB.prepare(
      `select * from presets where id = ?`,
    ).bind(id).first();

    if (!preset) {
      return jsonResponse({ error: "预设不存在" }, 404);
    }

    return jsonResponse({ preset: {
      ...preset,
      preview_images: typeof preset.preview_images === "string" ? JSON.parse(preset.preview_images as string) : preset.preview_images,
    } }, 200);
  } catch {
    return jsonResponse({ error: "加载失败" }, 500);
  }
};
