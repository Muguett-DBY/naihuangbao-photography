import { getUserFromRequest } from "../../_auth";
import { badRequest, forbidden, jsonResponse, unauthorized, unavailable } from "../../_responses";
import { enforceRateLimit, getRequiredAuthSecret, rateLimited, requirePublicMutationRequest } from "../../_security";
import { hashPublishedProject, validatePublishedProjectDraft } from "../../../src/lib/project-publish-contract";
import type { PublishedProjectSnapshot } from "../../../src/types/published-project";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string) {
  const base = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base || "visual-project"}-${suffix}`;
}

type PublishEnv = Env & { AUTH_SECRET?: string };

export const onRequestPost: PagesFunction<PublishEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return jsonResponse({ error: "Project publishing is not configured" }, 503);
  const user = await getUserFromRequest(context.request, secret, context.env.DB);
  if (!user) return unauthorized("Sign in to publish visual projects");

  const limit = await enforceRateLimit(context.request, context.env, `project-publish:${user.userId}`, 20, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = await context.request.json().catch(() => null) as { draft?: unknown; slug?: unknown } | null;
  if (!validatePublishedProjectDraft(body?.draft)) return badRequest("Invalid published project payload");
  if (JSON.stringify(body.draft).length > 160_000) return badRequest("Published project is too large");

  const requestedSlug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (requestedSlug && !slugPattern.test(requestedSlug)) return badRequest("Invalid project slug");
  const slug = requestedSlug || slugify(body.draft.project.name);
  const contentHash = await hashPublishedProject(body.draft.project);
  if (contentHash !== body.draft.contentHash) return badRequest("Published project content hash does not match its payload");

  try {
    const handle = await claimProjectHandle(context.env.DB, slug, user.userId, body.draft.project.id);
    if (handle === "owned_by_another_user") return forbidden("This project address belongs to another account");
    if (handle === "different_project") return badRequest("This project address belongs to a different project");
    if (handle === "legacy_address") return jsonResponse({ error: "This legacy project address cannot be updated" }, 409);

    const allocation = await context.env.DB.prepare(
      `update published_project_handles
       set latest_version = latest_version + 1, updated_at = ?
       where slug = ? and owner_user_id = ? and project_id = ?
       returning latest_version`,
    ).bind(new Date().toISOString(), slug, user.userId, body.draft.project.id).first<{ latest_version: number }>();
    if (!allocation) return forbidden("Project publishing ownership check failed");

    const version = Number(allocation.latest_version);
    const id = crypto.randomUUID();
    const publishedAt = new Date().toISOString();
    const objectKey = `published-projects/${slug}/${id}.json`;
    const snapshot: PublishedProjectSnapshot = { ...body.draft, contentHash, id, slug, version, publishedAt };
    await context.env.PHOTO_BUCKET.put(objectKey, JSON.stringify(snapshot), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { projectId: snapshot.project.id, ownerUserId: user.userId, contentHash },
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

type ProjectHandleRow = {
  owner_user_id: string;
  project_id: string;
};

async function claimProjectHandle(db: D1Database, slug: string, userId: string, projectId: string) {
  let handle = await db.prepare(
    "select owner_user_id, project_id from published_project_handles where slug = ?",
  ).bind(slug).first<ProjectHandleRow>();

  if (!handle) {
    const legacy = await db.prepare("select id from published_projects where slug = ? limit 1")
      .bind(slug)
      .first<{ id: string }>();
    if (legacy) return "legacy_address" as const;

    const now = new Date().toISOString();
    try {
      await db.prepare(
        `insert into published_project_handles
          (slug, owner_user_id, project_id, latest_version, created_at, updated_at)
         values (?, ?, ?, 0, ?, ?)`,
      ).bind(slug, userId, projectId, now, now).run();
    } catch {
      // A concurrent creator may have claimed the slug first; ownership is checked below.
    }
    handle = await db.prepare(
      "select owner_user_id, project_id from published_project_handles where slug = ?",
    ).bind(slug).first<ProjectHandleRow>();
  }

  if (!handle || handle.owner_user_id !== userId) return "owned_by_another_user" as const;
  if (handle.project_id !== projectId) return "different_project" as const;
  return "ok" as const;
}
