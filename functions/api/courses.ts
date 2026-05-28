import { jsonResponse, badRequest, unavailable } from "../_responses";

// ── Public: GET /api/courses ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ courses: [], source: "defaults" }, 200);
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, title, title_en, title_ko, title_ja, description, description_en, description_ko, description_ja,
              cover_image_url, video_url, category, difficulty, duration_minutes, sort_order
       from courses
       where published = 1
       order by sort_order asc, created_at desc`,
    ).all();

    return jsonResponse({ courses: result.results }, 200, {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (error) {
    return jsonResponse({ courses: [], source: "defaults" }, 200);
  }
};
