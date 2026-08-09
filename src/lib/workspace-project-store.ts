import type { VisualAsset } from "../types/visual-asset";
import type { WorkspaceAssetReference, WorkspaceProject, WorkspaceSurface } from "../types/workspace-project";
import { runLocalStudioRequest } from "./local-studio-db";

export const DEFAULT_WORKSPACE_ACCENT = "#6f8468";
export const MAX_WORKSPACE_ASSETS = 64;

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
    version: 1,
    projectType: "workspace",
    name: input.name?.trim() || "First Light Study",
    description: input.description?.trim() || "A local workspace for collected frames, compositions, and visual stories.",
    accent: input.accent || DEFAULT_WORKSPACE_ACCENT,
    coverAssetId: assets[0]?.assetId,
    assets,
    compositionIds: [],
    storyIds: [],
    activeSurface: "archive",
    createdAt: now,
    updatedAt: now,
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

export function linkWorkspaceResource(project: WorkspaceProject, surface: Extract<WorkspaceSurface, "studio" | "story">, id: string): WorkspaceProject {
  const key = surface === "studio" ? "compositionIds" : "storyIds";
  const values = project[key];
  if (values.includes(id) && project.activeSurface === surface) return project;
  return {
    ...project,
    [key]: values.includes(id) ? values : [...values, id],
    activeSurface: surface,
    updatedAt: Date.now(),
  };
}

export function updateWorkspaceProject(project: WorkspaceProject, patch: Partial<Pick<WorkspaceProject, "name" | "description" | "accent" | "activeSurface" | "coverAssetId">>): WorkspaceProject {
  return { ...project, ...patch, updatedAt: Date.now() };
}

export async function saveWorkspaceProject(project: WorkspaceProject) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("workspaceProjects", "readwrite", (store) => store.put(project));
}

export async function listWorkspaceProjects() {
  if (!("indexedDB" in window)) return [];
  const projects = await runLocalStudioRequest<WorkspaceProject[]>("workspaceProjects", "readonly", (store) => store.getAll());
  return projects.filter(isWorkspaceProject).sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function deleteWorkspaceProject(id: string) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("workspaceProjects", "readwrite", (store) => store.delete(id));
}

export function isWorkspaceProject(value: unknown): value is WorkspaceProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<WorkspaceProject>;
  return project.version === 1
    && project.projectType === "workspace"
    && typeof project.id === "string"
    && typeof project.name === "string"
    && Array.isArray(project.assets)
    && Array.isArray(project.compositionIds)
    && Array.isArray(project.storyIds);
}
