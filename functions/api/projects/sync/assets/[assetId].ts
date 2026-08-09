import { badRequest, jsonResponse, unavailable, withSecurityHeaders } from "../../../../_responses";
import { requireProjectSyncUser, type ProjectSyncEnv } from "../../../../_project-sync";
import { requirePublicMutationRequest } from "../../../../_security";
import { MAX_SYNC_ASSET_BYTES } from "../../../../../src/lib/project-sync-contract";

type AssetRow = { object_key: string; content_type: string; size: number; updated_at: string };

const supportedImageTypes = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);

function assetId(context: EventContext<ProjectSyncEnv, string, unknown>) {
  const value = String(context.params.assetId ?? "");
  return value.length <= 140 && /^[a-zA-Z0-9_-]+$/.test(value) ? value : null;
}

export const onRequestGet: PagesFunction<ProjectSyncEnv> = async (context) => {
  const auth = await requireProjectSyncUser(context.request, context.env);
  if (!auth.ok) return auth.response;
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
    await context.env.PHOTO_BUCKET.put(objectKey, bytes, {
      httpMetadata: { contentType, cacheControl: "private, no-store" },
      customMetadata: { userId: auth.userId, assetId: id },
    });
    try {
      await context.env.DB.prepare(
        `insert into synced_vault_assets (user_id, asset_id, object_key, content_type, size, updated_at)
         values (?, ?, ?, ?, ?, ?)
         on conflict(user_id, asset_id) do update set object_key = excluded.object_key, content_type = excluded.content_type, size = excluded.size, updated_at = excluded.updated_at`,
      ).bind(auth.userId, id, objectKey, contentType, bytes.byteLength, updatedAt).run();
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
