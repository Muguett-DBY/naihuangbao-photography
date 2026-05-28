import { jsonResponse, logWorkerError } from "../_responses";

// ── Public: GET /api/presets ──
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ presets: [], source: "defaults" }, 200);
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, name, name_en, name_ko, name_ja, description, description_en, description_ko, description_ja,
              category, preview_images, download_url, price_display, featured, download_count
       from presets
       order by featured desc, created_at desc`,
    ).all();

    const presets = result.results.map((r) => ({
      ...r,
      preview_images: typeof r.preview_images === "string" ? JSON.parse(r.preview_images as string) : r.preview_images,
    }));

    return jsonResponse({ presets }, 200, {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (error) {
    logWorkerError("Presets list", error, { route: "/api/presets" });
    return jsonResponse({ presets: [], source: "defaults" }, 200);
  }
};
