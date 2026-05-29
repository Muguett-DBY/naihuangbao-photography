import { jsonResponse, unauthorized, unavailable } from "../../_responses";
import { getUserFromRequest } from "../../_auth";

type AuthEnv = Env & { AUTH_SECRET?: string };

type CourseRow = {
  id: string;
  title: string;
  title_en: string | null;
  category: string;
  difficulty: string;
  cover_image_url: string | null;
  progress: number;
  purchased_at: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const secret = context.env.AUTH_SECRET || "default-auth-secret";
  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ courses: [] }, 503);
  }

  try {
    const result = await context.env.DB.prepare(
      `select c.id, c.title, c.title_en, c.category, c.difficulty, c.cover_image_url,
              cp.progress, cp.created_at as purchased_at
       from course_purchases cp
       join courses c on c.id = cp.course_id
       where cp.user_id = ?
       order by cp.created_at desc`,
    )
      .bind(user.userId)
      .all<CourseRow>();

    return jsonResponse({ courses: result.results });
  } catch {
    return jsonResponse({ courses: [] });
  }
};
