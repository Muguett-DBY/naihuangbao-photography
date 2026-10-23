import { jsonResponse, withSecurityHeaders } from "../../../_responses";

type PhotoObjectRow = {
  object_key: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id;
  if (typeof id !== "string") {
    return notFound();
  }
  const bucket = context.env.PHOTO_BUCKET;
  if (!bucket) return jsonResponse({ error: "Photo storage is not configured" }, 503, { "cache-control": "no-store" });

  const row = await context.env.DB.prepare(
    `select object_key
     from photos
     where id = ? and client_authorized = 1 and visibility = 'public'`,
  )
    .bind(id)
    .first<PhotoObjectRow>();

  if (!row) {
    return notFound();
  }

  const object = await bucket.get(row.object_key);
  if (!object) {
    return notFound();
  }

  const headers = withSecurityHeaders();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
};

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: withSecurityHeaders({
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    }),
  });
}
