import { badRequest, jsonResponse, unavailable } from "../../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../_security";
import { validatePublishedProjectDraft } from "../../../src/lib/project-publish-contract";
import type { PublishedProjectSnapshot } from "../../../src/types/published-project";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string) {
  const base = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base || "visual-project"}-${suffix}`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;
  const limit = await enforceRateLimit(context.request, context.env, "project-publish", 20, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = await context.request.json().catch(() => null) as { draft?: unknown; slug?: unknown } | null;
  if (!validatePublishedProjectDraft(body?.draft)) return badRequest("Invalid published project payload");
  if (JSON.stringify(body.draft).length > 160_000) return badRequest("Published project is too large");

  const requestedSlug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (requestedSlug && !slugPattern.test(requestedSlug)) return badRequest("Invalid project slug");
  const slug = requestedSlug || slugify(body.draft.project.name);

  try {
    const latest = await context.env.DB.prepare(
      "select coalesce(max(version), 0) as version from published_projects where slug = ?",
    ).bind(slug).first<{ version: number }>();
    const version = Number(latest?.version ?? 0) + 1;
    const id = crypto.randomUUID();
    const publishedAt = new Date().toISOString();
    const objectKey = `published-projects/${slug}/v${version}.json`;
    const snapshot: PublishedProjectSnapshot = { ...body.draft, id, slug, version, publishedAt };
    await context.env.PHOTO_BUCKET.put(objectKey, JSON.stringify(snapshot), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { projectId: snapshot.project.id, contentHash: snapshot.contentHash },
    });
    try {
      await context.env.DB.prepare(
        `insert into published_projects (id, slug, project_id, version, title, object_key, content_hash, published_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, slug, snapshot.project.id, version, snapshot.project.name, objectKey, snapshot.contentHash, publishedAt).run();
    } catch (error) {
      await context.env.PHOTO_BUCKET.delete(objectKey);
      throw error;
    }
    return jsonResponse({ id, slug, version, publishedAt, contentHash: snapshot.contentHash, url: `/share/${slug}` }, 201, { "cache-control": "no-store" });
  } catch (error) {
    return unavailable("Failed to publish project", error, { route: "/api/projects/publish", method: "POST" });
  }
};
