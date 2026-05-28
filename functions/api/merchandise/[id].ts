import { jsonResponse } from "../../_responses";

// ── Public: GET /api/merchandise/:id ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "服务不可用" }, 503);
  }

  const id = (context.params as Record<string, string>).id;

  try {
    const item = await context.env.DB.prepare(
      `select * from merchandise where id = ? and available = 1`,
    ).bind(id).first();

    if (!item) {
      return jsonResponse({ error: "产品不存在" }, 404);
    }

    return jsonResponse({ merchandise: item }, 200);
  } catch {
    return jsonResponse({ error: "加载失败" }, 500);
  }
};
