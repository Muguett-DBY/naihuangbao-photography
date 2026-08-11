import { badRequest, jsonResponse, unavailable, withSecurityHeaders } from "../../../../_responses";
import { requireProjectSyncUser, type ProjectSyncEnv } from "../../../../_project-sync";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../../../_security";
import { MAX_SYNC_ASSET_BYTES, MAX_SYNC_ASSET_BYTES_PER_USER, MAX_SYNC_ASSETS_PER_USER } from "../../../../../src/lib/project-sync-contract";

type AssetRow = { object_key: string; content_type: string; size: number; updated_at: string };
type AssetUsageRow = { asset_count: number; total_bytes: number };

const supportedImageTypes = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);
const assetReadLimitPerHour = 600;
const assetWriteLimitPerHour = 200;

function assetId(context: EventContext<ProjectSyncEnv, string, unknown>) {
  const value = String(context.params.assetId ?? "");
  return value.length <= 140 && /^[a-zA-Z0-9_-]+$/.test(value) ? value : null;
}

export const onRequestGet: PagesFunction<ProjectSyncEnv> = async (context) => {
  const auth = await requireProjectSyncUser(context.request, context.env);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(context.request, context.env, `project-sync-assets-read:${auth.userId}`, assetReadLimitPerHour, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter, assetReadLimitPerHour);
  const id = assetId(context);
  if (!id) return badRequest("Invalid asset id");
  try {
    const row = await context.env.DB.prepare(
      "select object_key, content_type, size, updated_at from synced_vault_assets where user_id = ? and asset_id = ?",
    ).bind(auth.userId, id).first<AssetRow>();
    if (!row) return jsonResponse({ error: "Synced asset not found" }, 404);
    const object = await context.env.PHOTO_BUCKET.get(row.object_key);
    if (!object) return jsonResponse({ error: "Synced asset payload is unavailable" }, 404);
    return new Response(object.body, { status: 200, headers: withSecurityHeaders({ "content-type": row.content_type, "content-length": String(row.size), "cache-control": "private, no-store", "x-nhb-asset-updated": row.updated_at }) });
  } catch (error) {
    return unavailable("Failed to load synced asset", error, { route: "/api/projects/sync/assets/:assetId", method: "GET" });
  }
};

export const onRequestPut: PagesFunction<ProjectSyncEnv> = async (context) => {
  const actionError = requirePublicMutationRequest(context.request);
  if (actionError) return actionError;
  const auth = await requireProjectSyncUser(context.request, context.env);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(context.request, context.env, `project-sync-assets-write:${auth.userId}`, assetWriteLimitPerHour, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter, assetWriteLimitPerHour);
  const id = assetId(context);
  if (!id) return badRequest("Invalid asset id");
  const contentType = context.request.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!supportedImageTypes.has(contentType)) return badRequest("Only AVIF, JPEG, PNG, and WebP assets can be synced");
  const declaredLength = Number(context.request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_SYNC_ASSET_BYTES) return badRequest("Synced asset exceeds 12 MB");
  const bytes = await context.request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_SYNC_ASSET_BYTES) return badRequest("Synced asset exceeds 12 MB");
  const objectKey = `workspace-users/${auth.userId}/assets/${id}/${crypto.randomUUID()}`;
  const updatedAt = new Date().toISOString();
  try {
    const previous = await context.env.DB.prepare(
      "select object_key, content_type, size, updated_at from synced_vault_assets where user_id = ? and asset_id = ?",
    ).bind(auth.userId, id).first<AssetRow>();
    const usage = await context.env.DB.prepare(
      `select count(*) as asset_count, coalesce(sum(size), 0) as total_bytes
       from synced_vault_assets where user_id = ?`,
    ).bind(auth.userId).first<AssetUsageRow>();
    const nextCount = Number(usage?.asset_count ?? 0) + (previous ? 0 : 1);
    const nextBytes = Number(usage?.total_bytes ?? 0) - Number(previous?.size ?? 0) + bytes.byteLength;
    if (nextCount > MAX_SYNC_ASSETS_PER_USER || nextBytes > MAX_SYNC_ASSET_BYTES_PER_USER) {
      return jsonResponse({
        error: "Workspace storage quota exceeded",
        limits: { assets: MAX_SYNC_ASSETS_PER_USER, bytes: MAX_SYNC_ASSET_BYTES_PER_USER },
      }, 413, { "cache-control": "no-store" });
    }
    await context.env.PHOTO_BUCKET.put(objectKey, bytes, {
      httpMetadata: { contentType, cacheControl: "private, no-store" },
      customMetadata: { userId: auth.userId, assetId: id },
    });
    try {
      const writeResult = await context.env.DB.prepare(
        `insert into synced_vault_assets (user_id, asset_id, object_key, content_type, size, updated_at)
         select ?, ?, ?, ?, ?, ?
         where (
           select count(*) from synced_vault_assets where user_id = ? and asset_id <> ?
         ) < ?
           and (
             select coalesce(sum(size), 0) from synced_vault_assets where user_id = ? and asset_id <> ?
           ) + ? <= ?
           and (
             (? is null and not exists (
               select 1 from synced_vault_assets where user_id = ? and asset_id = ?
             ))
             or exists (
               select 1 from synced_vault_assets where user_id = ? and asset_id = ? and object_key = ?
             )
           )
         on conflict(user_id, asset_id) do update set object_key = excluded.object_key, content_type = excluded.content_type, size = excluded.size, updated_at = excluded.updated_at`,
      ).bind(
        auth.userId, id, objectKey, contentType, bytes.byteLength, updatedAt,
        auth.userId, id, MAX_SYNC_ASSETS_PER_USER,
        auth.userId, id, bytes.byteLength, MAX_SYNC_ASSET_BYTES_PER_USER,
        previous?.object_key ?? null, auth.userId, id,
        auth.userId, id, previous?.object_key ?? null,
      ).run();
      if (Number(writeResult.meta.changes ?? 0) !== 1) {
        await context.env.PHOTO_BUCKET.delete(objectKey);
        const latest = await context.env.DB.prepare(
          "select object_key, content_type, size, updated_at from synced_vault_assets where user_id = ? and asset_id = ?",
        ).bind(auth.userId, id).first<AssetRow>();
        if ((previous && latest?.object_key !== previous.object_key) || (!previous && latest)) {
          return jsonResponse({ error: "Asset changed on another device", conflict: true, updatedAt: latest?.updated_at }, 409, { "cache-control": "no-store" });
        }
        return jsonResponse({
          error: "Workspace storage quota exceeded",
          limits: { assets: MAX_SYNC_ASSETS_PER_USER, bytes: MAX_SYNC_ASSET_BYTES_PER_USER },
        }, 413, { "cache-control": "no-store" });
      }
    } catch (error) {
      await context.env.PHOTO_BUCKET.delete(objectKey);
      throw error;
    }
    if (previous?.object_key && previous.object_key !== objectKey) {
      await context.env.PHOTO_BUCKET.delete(previous.object_key).catch(() => undefined);
    }
    return jsonResponse({ assetId: id, size: bytes.byteLength, updatedAt }, 200, { "cache-control": "no-store" });
  } catch (error) {
    return unavailable("Failed to sync asset", error, { route: "/api/projects/sync/assets/:assetId", method: "PUT" });
  }
};
