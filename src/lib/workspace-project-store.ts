import type { VisualAsset } from "../types/visual-asset";
import type {
  LegacyWorkspaceProject,
  WorkspaceAssetReference,
  WorkspaceEventType,
  WorkspaceProject,
  WorkspaceProjectEvent,
  WorkspaceSurface,
} from "../types/workspace-project";
import { runLocalStudioRequest } from "./local-studio-db";

export const DEFAULT_WORKSPACE_ACCENT = "#6f8468";
export const MAX_WORKSPACE_ASSETS = 64;

export const DEFAULT_EXHIBITION = {
  theme: "paper",
  density: "editorial",
  motion: "calm",
  showIndex: true,
} as const;

export function createWorkspaceProjectId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `workspace-${crypto.randomUUID()}`
    : `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createWorkspaceProject(input: Partial<Pick<WorkspaceProject, "name" | "description" | "accent" | "assets">> = {}): WorkspaceProject {
  const now = Date.now();
  const assets = input.assets?.slice(0, MAX_WORKSPACE_ASSETS) ?? [];
  return {
    id: createWorkspaceProjectId(),
    version: 2,
    projectType: "workspace",
    name: input.name?.trim() || "First Light Study",
    description: input.description?.trim() || "A local workspace for collected frames, compositions, and visual stories.",
    accent: input.accent || DEFAULT_WORKSPACE_ACCENT,
    coverAssetId: assets[0]?.assetId,
    assets,
    vaultAssetIds: [],
    creativeDocumentIds: [],
    compositionIds: [],
    storyIds: [],
    activeSurface: "archive",
    status: "active",
    exhibition: DEFAULT_EXHIBITION,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

export function migrateWorkspaceProject(project: WorkspaceProject | LegacyWorkspaceProject): WorkspaceProject {
  if (project.version === 2) {
    return {
      ...project,
      vaultAssetIds: project.vaultAssetIds ?? [],
      creativeDocumentIds: project.creativeDocumentIds ?? [],
      status: project.status ?? "active",
      exhibition: project.exhibition ?? DEFAULT_EXHIBITION,
      lastOpenedAt: project.lastOpenedAt ?? project.updatedAt,
    };
  }
  return {
    ...project,
    version: 2,
    vaultAssetIds: [],
    creativeDocumentIds: [],
    status: "active",
    exhibition: DEFAULT_EXHIBITION,
    lastOpenedAt: project.updatedAt,
  };
}

export function toWorkspaceAsset(asset: Pick<VisualAsset, "id" | "src" | "alt">, title = asset.alt): WorkspaceAssetReference {
  return {
    assetId: asset.id,
    src: asset.src,
    alt: asset.alt,
    title,
    source: "archive",
    addedAt: Date.now(),
  };
}

export function addWorkspaceAsset(project: WorkspaceProject, asset: WorkspaceAssetReference): WorkspaceProject {
  if (project.assets.some((entry) => entry.assetId === asset.assetId)) return project;
  const assets = [...project.assets, asset].slice(-MAX_WORKSPACE_ASSETS);
  return {
    ...project,
    assets,
    coverAssetId: project.coverAssetId ?? asset.assetId,
    updatedAt: Date.now(),
  };
}

export function removeWorkspaceAsset(project: WorkspaceProject, assetId: string): WorkspaceProject {
  const assets = project.assets.filter((entry) => entry.assetId !== assetId);
  return {
    ...project,
    assets,
    coverAssetId: project.coverAssetId === assetId ? assets[0]?.assetId : project.coverAssetId,
    updatedAt: Date.now(),
  };
}

export function linkWorkspaceResource(project: WorkspaceProject, surface: Extract<WorkspaceSurface, "composer" | "studio" | "story">, id: string): WorkspaceProject {
  const key = surface === "studio" ? "compositionIds" : surface === "story" ? "storyIds" : "creativeDocumentIds";
  const values = project[key];
  if (values.includes(id) && project.activeSurface === surface) return project;
  return {
    ...project,
    [key]: values.includes(id) ? values : [...values, id],
    activeSurface: surface,
    updatedAt: Date.now(),
  };
}

export function updateWorkspaceProject(project: WorkspaceProject, patch: Partial<Pick<WorkspaceProject, "name" | "description" | "accent" | "activeSurface" | "coverAssetId" | "status" | "exhibition" | "lastOpenedAt">>): WorkspaceProject {
  return { ...project, ...patch, updatedAt: Date.now() };
}

export function linkVaultAsset(project: WorkspaceProject, asset: WorkspaceAssetReference): WorkspaceProject {
  const next = addWorkspaceAsset(project, asset);
  if (next.vaultAssetIds.includes(asset.assetId)) return next;
  return { ...next, vaultAssetIds: [...next.vaultAssetIds, asset.assetId], activeSurface: "vault", updatedAt: Date.now() };
}

export async function saveWorkspaceProject(project: WorkspaceProject) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("workspaceProjects", "readwrite", (store) => store.put(project));
}

export async function listWorkspaceProjects() {
  if (!("indexedDB" in window)) return [];
  const projects = await runLocalStudioRequest<Array<WorkspaceProject | LegacyWorkspaceProject>>("workspaceProjects", "readonly", (store) => store.getAll());
  return projects.filter(isWorkspaceProject).map(migrateWorkspaceProject).sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function deleteWorkspaceProject(id: string) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("workspaceProjects", "readwrite", (store) => store.delete(id));
}

export function createWorkspaceEvent(project: WorkspaceProject, type: WorkspaceEventType, summary: string, surface = project.activeSurface): WorkspaceProjectEvent {
  const createdAt = Date.now();
  return {
    id: `${project.id}-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    projectId: project.id,
    type,
    surface,
    summary,
    createdAt,
  };
}

export async function saveWorkspaceEvent(event: WorkspaceProjectEvent) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("workspaceEvents", "readwrite", (store) => store.put(event));
}

export async function listWorkspaceEvents(projectId?: string, limit = 32) {
  if (!("indexedDB" in window)) return [];
  const events = await runLocalStudioRequest<WorkspaceProjectEvent[]>("workspaceEvents", "readonly", (store) => store.getAll());
  return events
    .filter((event) => !projectId || event.projectId === projectId)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, limit);
}

export function isWorkspaceProject(value: unknown): value is WorkspaceProject | LegacyWorkspaceProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<WorkspaceProject | LegacyWorkspaceProject>;
  return (project.version === 1 || project.version === 2)
    && project.projectType === "workspace"
    && typeof project.id === "string"
    && typeof project.name === "string"
    && Array.isArray(project.assets)
    && Array.isArray(project.compositionIds)
    && Array.isArray(project.storyIds);
}
