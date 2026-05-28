import { jsonResponse } from "../../_responses";

// ── Public: GET /api/workshops/:id ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "服务不可用" }, 503);
  }

  const id = (context.params as Record<string, string>).id;

  try {
    const workshop = await context.env.DB.prepare(
      `select * from workshops where id = ?`,
    ).bind(id).first();

    if (!workshop) {
      return jsonResponse({ error: "活动不存在" }, 404);
    }

    return jsonResponse(workshop, 200);
  } catch {
    return jsonResponse({ error: "加载失败" }, 500);
  }
};
