import { badRequest, jsonResponse, unavailable } from "../../../_responses";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PublishedRow = {
  slug: string;
  version: number;
  object_key: string;
  content_hash: string;
  published_at: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = String(context.params.slug ?? "").trim().toLowerCase();
  if (!slugPattern.test(slug)) return badRequest("Invalid project slug");
  const url = new URL(context.request.url);

  try {
    if (url.searchParams.get("versions") === "1") {
      const rows = await context.env.DB.prepare(
        "select slug, version, content_hash, published_at from published_projects where slug = ? order by version desc limit 24",
      ).bind(slug).all<PublishedRow>();
      return jsonResponse({ versions: rows.results.map((row) => ({ slug: row.slug, version: row.version, contentHash: row.content_hash, publishedAt: row.published_at })) }, 200, { "cache-control": "public, max-age=30" });
    }

    const requestedVersion = Number(url.searchParams.get("version") ?? 0);
    if (!Number.isInteger(requestedVersion) || requestedVersion < 0) return badRequest("Invalid project version");
    const query = requestedVersion > 0
      ? "select slug, version, object_key, content_hash, published_at from published_projects where slug = ? and version = ? limit 1"
      : "select slug, version, object_key, content_hash, published_at from published_projects where slug = ? order by version desc limit 1";
    const statement = context.env.DB.prepare(query);
    const row = requestedVersion > 0
      ? await statement.bind(slug, requestedVersion).first<PublishedRow>()
      : await statement.bind(slug).first<PublishedRow>();
    if (!row) return jsonResponse({ error: "Published project not found" }, 404);
    const object = await context.env.PHOTO_BUCKET.get(row.object_key);
    if (!object) return jsonResponse({ error: "Published project asset not found" }, 404);
    const immutable = requestedVersion > 0;
    return new Response(object.body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=60, stale-while-revalidate=300",
        "etag": `\"${row.content_hash}\"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return unavailable("Failed to load published project", error, { route: "/api/projects/published/:slug", method: "GET" });
  }
};
