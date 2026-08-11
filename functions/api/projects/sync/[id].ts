import { badRequest, jsonResponse, unavailable } from "../../../_responses";
import { requireProjectSyncUser, type ProjectSyncEnv } from "../../../_project-sync";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../../_security";
import { hashSyncProject, isSyncWorkspaceProject, MAX_SYNC_PROJECT_BYTES, MAX_SYNC_PROJECTS_PER_USER, MAX_SYNC_PROJECT_VERSIONS } from "../../../../src/lib/project-sync-contract";

type CurrentProjectRow = { revision: number; content_hash: string; object_key: string; updated_at: string };
type VersionRow = { revision: number; content_hash: string; object_key: string; created_at: string };
type StoredVersionRow = VersionRow & { id: string };

function projectId(context: EventContext<ProjectSyncEnv, string, unknown>) {
  const value = String(context.params.id ?? "");
  return value.length <= 120 && /^[a-zA-Z0-9_-]+$/.test(value) ? value : null;
}

export const onRequestGet: PagesFunction<ProjectSyncEnv> = async (context) => {
  const auth = await requireProjectSyncUser(context.request, context.env);
  if (!auth.ok) return auth.response;
  const id = projectId(context);
  if (!id) return badRequest("Invalid project id");
  const url = new URL(context.request.url);
  try {
    if (url.searchParams.get("versions") === "1") {
      const rows = await context.env.DB.prepare(
        `select revision, content_hash, object_key, created_at from workspace_project_versions
         where user_id = ? and project_id = ? order by revision desc limit ?`,
      ).bind(auth.userId, id, MAX_SYNC_PROJECT_VERSIONS).all<VersionRow>();
      return jsonResponse({ versions: rows.results.map((row) => ({ projectId: id, revision: row.revision, contentHash: row.content_hash, updatedAt: row.created_at })) }, 200, { "cache-control": "no-store" });
    }

    const requestedRevision = Number(url.searchParams.get("revision") || 0);
    const row = requestedRevision > 0
      ? await context.env.DB.prepare(
        `select revision, content_hash, object_key, created_at as updated_at from workspace_project_versions
         where user_id = ? and project_id = ? and revision = ?`,
      ).bind(auth.userId, id, requestedRevision).first<CurrentProjectRow>()
      : await context.env.DB.prepare(
        `select revision, content_hash, object_key, updated_at from synced_workspace_projects
         where user_id = ? and project_id = ?`,
      ).bind(auth.userId, id).first<CurrentProjectRow>();
    if (!row) return jsonResponse({ error: "Synced project not found" }, 404);
    const object = await context.env.PHOTO_BUCKET.get(row.object_key);
    if (!object) return jsonResponse({ error: "Synced project payload is unavailable" }, 404);
    const project = await object.json();
    if (!isSyncWorkspaceProject(project)) throw new Error("Stored project payload is invalid");
    return jsonResponse({ project, projectId: id, revision: row.revision, contentHash: row.content_hash, updatedAt: row.updated_at }, 200, { "cache-control": "no-store" });
  } catch (error) {
    return unavailable("Failed to load synced project", error, { route: "/api/projects/sync/:id", method: "GET" });
  }
};

export const onRequestPut: PagesFunction<ProjectSyncEnv> = async (context) => {
  const actionError = requirePublicMutationRequest(context.request);
  if (actionError) return actionError;
  const auth = await requireProjectSyncUser(context.request, context.env);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(context.request, context.env, `project-sync-projects:${auth.userId}`, 120, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter, 120);
  const id = projectId(context);
  if (!id) return badRequest("Invalid project id");
  const raw = await context.request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_SYNC_PROJECT_BYTES) return badRequest("Synced project is too large");
  let body: { project?: unknown; expectedRevision?: unknown };
  try { body = JSON.parse(raw) as typeof body; } catch { return badRequest("Invalid project sync payload"); }
  if (!isSyncWorkspaceProject(body.project) || body.project.id !== id) return badRequest("Invalid project sync payload");
  const expectedRevision = Number(body.expectedRevision ?? 0);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return badRequest("Invalid expected revision");

  let objectKey = "";
  try {
    const current = await context.env.DB.prepare(
      "select revision, content_hash, object_key, updated_at from synced_workspace_projects where user_id = ? and project_id = ?",
    ).bind(auth.userId, id).first<CurrentProjectRow>();
    const currentRevision = Number(current?.revision ?? 0);
    if (currentRevision !== expectedRevision) {
      return jsonResponse({ error: "Project changed on another device", conflict: true, remoteRevision: currentRevision, contentHash: current?.content_hash, updatedAt: current?.updated_at }, 409, { "cache-control": "no-store" });
    }
    if (!current) {
      const projectCount = await context.env.DB.prepare(
        "select count(*) as project_count from synced_workspace_projects where user_id = ?",
      ).bind(auth.userId).first<{ project_count: number }>();
      if (Number(projectCount?.project_count ?? 0) >= MAX_SYNC_PROJECTS_PER_USER) {
        return jsonResponse({ error: "Workspace project quota exceeded", limit: MAX_SYNC_PROJECTS_PER_USER }, 413, { "cache-control": "no-store" });
      }
    }
    const versions = await context.env.DB.prepare(
      `select id, revision, content_hash, object_key, created_at
       from workspace_project_versions
       where user_id = ? and project_id = ?
       order by revision desc limit 100`,
    ).bind(auth.userId, id).all<StoredVersionRow>();
    const staleVersions = versions.results.slice(Math.max(0, MAX_SYNC_PROJECT_VERSIONS - 1));
    const revision = currentRevision + 1;
    const contentHash = await hashSyncProject(body.project);
    const updatedAt = new Date().toISOString();
    const versionId = crypto.randomUUID();
    objectKey = `workspace-users/${auth.userId}/projects/${id}/v${revision}-${versionId}.json`;
    await context.env.PHOTO_BUCKET.put(objectKey, JSON.stringify(body.project), {
      httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "private, no-store" },
      customMetadata: { userId: auth.userId, projectId: id, revision: String(revision), contentHash },
    });
    const writeResults = await context.env.DB.batch([
      context.env.DB.prepare(
        `insert into synced_workspace_projects (user_id, project_id, revision, content_hash, object_key, updated_at)
         select ?, ?, ?, ?, ?, ?
         where (select count(*) from synced_workspace_projects where user_id = ? and project_id <> ?) < ?
           and (
             (? = 0 and not exists (
               select 1 from synced_workspace_projects where user_id = ? and project_id = ?
             ))
             or exists (
               select 1 from synced_workspace_projects where user_id = ? and project_id = ? and revision = ?
             )
           )
         on conflict(user_id, project_id) do update set
           revision = excluded.revision,
           content_hash = excluded.content_hash,
           object_key = excluded.object_key,
           updated_at = excluded.updated_at
         where synced_workspace_projects.revision = ?`,
      ).bind(
        auth.userId, id, revision, contentHash, objectKey, updatedAt,
        auth.userId, id, MAX_SYNC_PROJECTS_PER_USER,
        expectedRevision, auth.userId, id,
        auth.userId, id, expectedRevision,
        expectedRevision,
      ),
      context.env.DB.prepare(
        `insert into workspace_project_versions (id, user_id, project_id, revision, content_hash, object_key, created_at)
         select ?, ?, ?, ?, ?, ?, ?
         where exists (
           select 1 from synced_workspace_projects
           where user_id = ? and project_id = ? and revision = ? and object_key = ?
         )`,
      ).bind(
        versionId, auth.userId, id, revision, contentHash, objectKey, updatedAt,
        auth.userId, id, revision, objectKey,
      ),
      ...staleVersions.map((version) => context.env.DB.prepare(
        `delete from workspace_project_versions
         where id = ? and user_id = ? and exists (
           select 1 from synced_workspace_projects
           where user_id = ? and project_id = ? and revision = ? and object_key = ?
         )`,
      ).bind(version.id, auth.userId, auth.userId, id, revision, objectKey)),
    ]);
    if (Number(writeResults[0]?.meta.changes ?? 0) !== 1) {
      await context.env.PHOTO_BUCKET.delete(objectKey).catch(() => undefined);
      objectKey = "";
      const latest = await context.env.DB.prepare(
        "select revision, content_hash, object_key, updated_at from synced_workspace_projects where user_id = ? and project_id = ?",
      ).bind(auth.userId, id).first<CurrentProjectRow>();
      if (latest || expectedRevision > 0) {
        return jsonResponse({ error: "Project changed on another device", conflict: true, remoteRevision: Number(latest?.revision ?? 0), contentHash: latest?.content_hash, updatedAt: latest?.updated_at }, 409, { "cache-control": "no-store" });
      }
      return jsonResponse({ error: "Workspace project quota exceeded", limit: MAX_SYNC_PROJECTS_PER_USER }, 413, { "cache-control": "no-store" });
    }
    if (staleVersions.length > 0) {
      context.waitUntil(
        context.env.PHOTO_BUCKET.delete(staleVersions.map((version) => version.object_key))
          .catch((error) => console.warn("Failed to prune workspace project versions", error)),
      );
    }
    return jsonResponse({ projectId: id, revision, contentHash, updatedAt }, 200, { "cache-control": "no-store" });
  } catch (error) {
    if (objectKey) await context.env.PHOTO_BUCKET.delete(objectKey).catch(() => undefined);
    return unavailable("Failed to sync project", error, { route: "/api/projects/sync/:id", method: "PUT" });
  }
};
