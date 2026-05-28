import { jsonResponse, logWorkerError } from "../_responses";

// ── Public: GET /api/merchandise ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ merchandise: [], source: "defaults" }, 200);
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, name, name_en, name_ko, name_ja, description, description_en, description_ko, description_ja,
              images, category, price_display, available
       from merchandise
       where available = 1
       order by created_at desc`,
    ).all();

    const items = result.results.map((r) => ({
      ...r,
      images: typeof r.images === "string" ? JSON.parse(r.images as string) : r.images,
    }));

    return jsonResponse({ merchandise: items }, 200, {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (error) {
    logWorkerError("Merchandise list", error, { route: "/api/merchandise" });
    return jsonResponse({ merchandise: [], source: "defaults" }, 200);
  }
};
