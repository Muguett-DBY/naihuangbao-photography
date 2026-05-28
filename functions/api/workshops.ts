import { jsonResponse, logWorkerError } from "../_responses";

// ── Public: GET /api/workshops ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ workshops: [], source: "defaults" }, 200);
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, title, title_en, title_ko, title_ja, description, description_en, description_ko, description_ja,
              cover_image_url, event_date, event_time, location, max_participants, current_participants,
              price_display, status
       from workshops
       where status in ('upcoming', 'ongoing')
       order by event_date asc`,
    ).all();

    return jsonResponse({ workshops: result.results }, 200, {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (error) {
    logWorkerError("Workshops list", error, { route: "/api/workshops" });
    return jsonResponse({ workshops: [], source: "defaults" }, 200);
  }
};
