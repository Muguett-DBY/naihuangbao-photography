import { buildPhotoSelectList, mapPublicPhoto, publicPhotosFallback, type PhotoRow } from "../_photos";
import { jsonResponse, logWorkerError } from "../_responses";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cache = context.env.CACHE;

  // Try KV cache first
  if (cache) {
    try {
      const cached = await cache.get("photos:public", "json");
      if (cached && typeof cached === "object" && "photos" in cached) {
        return jsonResponse(cached, 200, {
          "cache-control": "public, max-age=60, stale-while-revalidate=300",
          "x-cache": "kv-hit",
        });
      }
    } catch {
      // KV miss or error — fall through to D1
    }
  }

  try {
    const columns = await buildPhotoSelectList(context.env, [
      "id",
      "title",
      "style",
      "location",
      "image_url",
      "alt",
      "featured",
    ]);
    const result = await context.env.DB.prepare(
      `select ${columns}
       from photos
       where client_authorized = 1 and visibility = 'public'
       order by featured desc, created_at desc`,
    ).all<PhotoRow>();

    const body = { photos: result.results.map(mapPublicPhoto), source: "remote" };

    // Store in KV cache (TTL 300s = 5 min)
    if (cache) {
      context.waitUntil(cache.put("photos:public", JSON.stringify(body), { expirationTtl: 300 }));
    }

    return jsonResponse(body, 200, {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      "x-cache": "d1",
    });
  } catch (error) {
    logWorkerError("Public photos fallback", error, { route: "/api/photos" });

    return jsonResponse(
      { photos: publicPhotosFallback(), source: "defaults" },
      200,
      { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
    );
  }
};
