import type { WorkspaceProject } from "../types/workspace-project";
import type { PublishedProjectDraft } from "../types/published-project";

export const MAX_PUBLISHED_ASSETS = 48;

export function isPublicAssetSource(src: string) {
  return src.startsWith("/images/") || /^https:\/\//i.test(src);
}

export function validatePublishedProjectDraft(value: unknown): value is PublishedProjectDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<PublishedProjectDraft>;
  const project = draft.project as Partial<WorkspaceProject> | undefined;
  return draft.schemaVersion === 1
    && typeof draft.contentHash === "string"
    && /^[0-9a-f]{64}$/.test(draft.contentHash)
    && project?.version === 1
    && project.projectType === "workspace"
    && typeof project.id === "string"
    && typeof project.name === "string"
    && project.name.length > 0
    && project.name.length <= 80
    && typeof project.description === "string"
    && project.description.length <= 600
    && Array.isArray(project.assets)
    && project.assets.length <= MAX_PUBLISHED_ASSETS
    && project.assets.every((asset) => typeof asset?.assetId === "string" && typeof asset.src === "string" && isPublicAssetSource(asset.src));
}
