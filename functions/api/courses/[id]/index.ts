import { jsonResponse } from "../../../_responses";

// ── Public: GET /api/courses/:id ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "服务不可用" }, 503);
  }

  const id = (context.params as Record<string, string>).id;

  try {
    const course = await context.env.DB.prepare(
      `select * from courses where id = ? and published = 1`,
    ).bind(id).first();

    if (!course) {
      return jsonResponse({ error: "课程不存在" }, 404);
    }

    const modules = await context.env.DB.prepare(
      `select * from course_modules where course_id = ? order by sort_order asc`,
    ).bind(id).all();

    return jsonResponse({ course, modules: modules.results }, 200);
  } catch {
    return jsonResponse({ error: "加载失败" }, 500);
  }
};
