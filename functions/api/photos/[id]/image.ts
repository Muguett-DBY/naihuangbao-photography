type Env = {
  PHOTO_BUCKET: R2Bucket;
  DB: D1Database;
};

type PhotoObjectRow = {
  object_key: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id;
  if (typeof id !== "string") {
    return new Response("Not found", { status: 404 });
  }

  const row = await context.env.DB.prepare(
    `select object_key
     from photos
     where id = ? and client_authorized = 1 and visibility = 'public'`,
  )
    .bind(id)
    .first<PhotoObjectRow>();

  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const object = await context.env.PHOTO_BUCKET.get(row.object_key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
};
