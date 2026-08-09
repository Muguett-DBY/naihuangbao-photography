import { publicMutationHeaders } from "./admin-helpers";
import { safeLocalStorage } from "./browser-storage";
import { MAX_SYNC_ASSET_BYTES } from "./project-sync-contract";
import { getVaultAsset, readVaultBlob } from "./vault-store";
import { runLocalStudioRequest } from "./local-studio-db";
import type { ProjectSyncQueueItem, ProjectSyncReceipt, ProjectSyncSnapshot, ProjectSyncVersion } from "../types/project-sync";
import type { WorkspaceProject } from "../types/workspace-project";

const REVISION_KEY = "nhb-project-sync-revisions-v1";

type RevisionRegistry = Record<string, { revision: number; contentHash: string; updatedAt: string }>;

export class ProjectSyncConflict extends Error {
  constructor(public remoteRevision: number, public remoteUpdatedAt = "") {
    super("Project changed on another device");
    this.name = "ProjectSyncConflict";
  }
}

function readRevisions(): RevisionRegistry {
  try {
    const value = JSON.parse(safeLocalStorage.getItem(REVISION_KEY) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeRevision(projectId: string, receipt: Pick<ProjectSyncReceipt, "revision" | "contentHash" | "updatedAt">) {
  const revisions = readRevisions();
  revisions[projectId] = receipt;
  safeLocalStorage.setItem(REVISION_KEY, JSON.stringify(revisions));
}

export function getLocalSyncRevision(projectId: string) {
  return readRevisions()[projectId] ?? null;
}

async function uploadVaultAssets(project: WorkspaceProject) {
  let uploadedAssets = 0;
  let skippedAssets = 0;
  for (const id of project.vaultAssetIds) {
    const asset = await getVaultAsset(id);
    const blob = asset ? await readVaultBlob(asset) : null;
    if (!asset || !blob || blob.size > MAX_SYNC_ASSET_BYTES) {
      skippedAssets += 1;
      continue;
    }
    const response = await fetch(`/api/projects/sync/assets/${encodeURIComponent(id)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": asset.type, ...publicMutationHeaders },
      body: blob,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Failed to sync ${asset.name}`);
    }
    uploadedAssets += 1;
  }
  return { uploadedAssets, skippedAssets };
}

export async function syncWorkspaceProject(project: WorkspaceProject, expectedRevision = getLocalSyncRevision(project.id)?.revision ?? 0): Promise<ProjectSyncReceipt> {
  const assetStats = await uploadVaultAssets(project);
  const response = await fetch(`/api/projects/sync/${encodeURIComponent(project.id)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json", ...publicMutationHeaders },
    body: JSON.stringify({ project, expectedRevision }),
  });
  const body = await response.json().catch(() => ({})) as ProjectSyncReceipt & { error?: string; remoteRevision?: number; updatedAt?: string };
  if (response.status === 409) throw new ProjectSyncConflict(Number(body.remoteRevision ?? 0), body.updatedAt);
  if (!response.ok) throw new Error(body.error || "Project sync failed");
  const receipt = { ...body, ...assetStats };
  writeRevision(project.id, receipt);
  return receipt;
}

export async function queueWorkspaceSync(project: WorkspaceProject, expectedRevision = getLocalSyncRevision(project.id)?.revision ?? 0) {
  const item: ProjectSyncQueueItem = {
    id: `sync-${project.id}`,
    project,
    expectedRevision,
    createdAt: Date.now(),
    attempts: 0,
  };
  await runLocalStudioRequest("syncQueue", "readwrite", (store) => store.put(item));
  return item;
}

export async function listSyncQueue() {
  if (!("indexedDB" in window)) return [];
  const items = await runLocalStudioRequest<ProjectSyncQueueItem[]>("syncQueue", "readonly", (store) => store.getAll());
  return items.sort((left, right) => left.createdAt - right.createdAt);
}

export async function flushSyncQueue() {
  const items = await listSyncQueue();
  let completed = 0;
  for (const item of items) {
    try {
      await syncWorkspaceProject(item.project, item.expectedRevision);
      await runLocalStudioRequest("syncQueue", "readwrite", (store) => store.delete(item.id));
      completed += 1;
    } catch (error) {
      await runLocalStudioRequest("syncQueue", "readwrite", (store) => store.put({ ...item, attempts: item.attempts + 1 }));
      if (error instanceof ProjectSyncConflict) break;
    }
  }
  return { completed, remaining: items.length - completed };
}

export async function fetchSyncedProject(projectId: string, revision?: number): Promise<ProjectSyncSnapshot> {
  const query = revision ? `?revision=${revision}` : "";
  const response = await fetch(`/api/projects/sync/${encodeURIComponent(projectId)}${query}`, { credentials: "include", headers: { "cache-control": "no-cache" } });
  const body = await response.json().catch(() => ({})) as ProjectSyncSnapshot & { error?: string };
  if (!response.ok) throw new Error(body.error || "Synced project unavailable");
  writeRevision(projectId, body);
  return body;
}

export async function listSyncedProjectVersions(projectId: string): Promise<ProjectSyncVersion[]> {
  const response = await fetch(`/api/projects/sync/${encodeURIComponent(projectId)}?versions=1`, { credentials: "include" });
  const body = await response.json().catch(() => ({})) as { versions?: ProjectSyncVersion[]; error?: string };
  if (!response.ok || !Array.isArray(body.versions)) throw new Error(body.error || "Sync versions unavailable");
  return body.versions;
}
