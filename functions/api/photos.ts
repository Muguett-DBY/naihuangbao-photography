import { mapPublicPhoto, publicPhotosFallback, type PhotoRow } from "../_photos";
import { jsonResponse, logWorkerError } from "../_responses";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const result = await context.env.DB.prepare(
      `select id, title, style, location, image_url, alt, featured
       from photos
       where client_authorized = 1 and visibility = 'public'
       order by featured desc, created_at desc`,
    ).all<PhotoRow>();

    return jsonResponse(
      { photos: result.results.map(mapPublicPhoto), source: "remote" },
      200,
      { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
    );
  } catch (error) {
    logWorkerError("Public photos fallback", error, { route: "/api/photos" });

    return jsonResponse(
      { photos: publicPhotosFallback(), source: "defaults" },
      200,
      { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
    );
  }
};
