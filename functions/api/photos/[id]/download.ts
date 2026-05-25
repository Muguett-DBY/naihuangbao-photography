import type { PhotoItem } from "../../../../src/types/photo";

type PhotoRow = {
  id: string;
  title: string;
  style: string;
  location: string;
  object_key: string;
  image_url: string;
  alt: string;
  featured: number;
  client_authorized?: number;
  visibility?: string;
  created_at?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id;
  if (typeof id !== "string") {
    return new Response("Not found", { status: 404 });
  }

  const row = await context.env.DB.prepare(
    `select id, title, object_key
     from photos
     where id = ? and client_authorized = 1 and visibility = 'public'`,
  )
    .bind(id)
    .first<PhotoRow>();

  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const object = await context.env.PHOTO_BUCKET.get(row.object_key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const safeName = row.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_");
  const ext = row.object_key.split(".").pop() || "jpg";

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-disposition", `attachment; filename="${safeName}.${ext}"`);

  return new Response(object.body, { headers });
};
