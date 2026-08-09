import type { WorkspaceProject } from "../types/workspace-project";

export const MAX_SYNC_PROJECT_BYTES = 280_000;
export const MAX_SYNC_ASSET_BYTES = 12 * 1024 * 1024;

const workspaceSurfaces = new Set(["archive", "vault", "composer", "studio", "story", "publish"]);
const workspaceStatuses = new Set(["active", "paused", "published"]);
const exhibitionThemes = new Set(["paper", "gallery", "night"]);

function isBoundedString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isIdList(value: unknown) {
  return Array.isArray(value)
    && value.length <= 64
    && value.every((id) => isBoundedString(id, 140));
}

export function isSyncWorkspaceProject(value: unknown): value is WorkspaceProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<WorkspaceProject>;
  return project.version === 2
    && project.projectType === "workspace"
    && isBoundedString(project.id, 120)
    && isBoundedString(project.name, 80)
    && typeof project.description === "string"
    && project.description.length <= 600
    && isBoundedString(project.accent, 32)
    && (project.coverAssetId === undefined || isBoundedString(project.coverAssetId, 140))
    && Array.isArray(project.assets)
    && project.assets.length <= 64
    && project.assets.every((asset) => isBoundedString(asset?.assetId, 140)
      && isBoundedString(asset?.src, 2_048)
      && typeof asset?.alt === "string"
      && asset.alt.length <= 300
      && isBoundedString(asset?.title, 200)
      && ["archive", "upload", "composition"].includes(asset?.source)
      && Number.isFinite(asset?.addedAt))
    && isIdList(project.vaultAssetIds)
    && isIdList(project.creativeDocumentIds)
    && isIdList(project.compositionIds)
    && isIdList(project.storyIds)
    && workspaceSurfaces.has(project.activeSurface ?? "")
    && workspaceStatuses.has(project.status ?? "")
    && Boolean(project.exhibition)
    && exhibitionThemes.has(project.exhibition?.theme ?? "")
    && ["editorial", "immersive"].includes(project.exhibition?.density ?? "")
    && ["full", "calm"].includes(project.exhibition?.motion ?? "")
    && typeof project.exhibition?.showIndex === "boolean"
    && Number.isFinite(project.createdAt)
    && Number.isFinite(project.updatedAt)
    && Number.isFinite(project.lastOpenedAt);
}

export async function hashSyncProject(project: WorkspaceProject) {
  const payload = JSON.stringify(project);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
