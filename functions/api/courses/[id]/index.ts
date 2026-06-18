import { jsonResponse } from "../../../_responses";
import { getUserFromRequest } from "../../../_auth";
import { getRequiredAuthSecret } from "../../../_security";

type AuthEnv = Env & { AUTH_SECRET?: string };

// ── Public: GET /api/courses/:id ──
// Course metadata is always public. Module content is only returned for
// courses that are free or for which the authenticated user has purchased access.
export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
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

    const courseRecord = course as { price_cents?: number };
    const isPaid = courseRecord.price_cents && courseRecord.price_cents > 0;

    let hasAccess = !isPaid;

    if (isPaid) {
      const secret = getRequiredAuthSecret(context.env as AuthEnv);
      const user = secret ? await getUserFromRequest(context.request, secret) : null;

      if (user) {
        const purchase = await context.env.DB.prepare(
          `SELECT id FROM course_purchases WHERE course_id = ? AND user_id = ?`,
        ).bind(id, user.userId).first();
        hasAccess = !!purchase;
      }
    }

    const sanitizedModules = hasAccess
      ? modules.results
      : modules.results.map((m) => {
          const mod = m as Record<string, unknown>;
          return { ...mod, content: undefined };
        });

    return jsonResponse({ course, modules: sanitizedModules }, 200);
  } catch (error) {
    console.error("[courses]", error);
    return jsonResponse({ error: "加载失败" }, 500);
  }
};
