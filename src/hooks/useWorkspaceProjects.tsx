import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { VisualAsset } from "../types/visual-asset";
import type { WorkspaceProject, WorkspaceSurface } from "../types/workspace-project";
import { safeLocalStorage } from "../lib/browser-storage";
import {
  addWorkspaceAsset,
  createWorkspaceProject,
  deleteWorkspaceProject,
  linkWorkspaceResource,
  listWorkspaceProjects,
  removeWorkspaceAsset,
  saveWorkspaceProject,
  toWorkspaceAsset,
  updateWorkspaceProject,
} from "../lib/workspace-project-store";

const ACTIVE_PROJECT_KEY = "nhb-active-workspace-project-v1";
const LEGACY_EXHIBITION_KEY = "nhb-archive-exhibition-v1";

type WorkspaceProjectContextValue = {
  ready: boolean;
  projects: WorkspaceProject[];
  activeProject: WorkspaceProject | null;
  setActiveProjectId: (id: string) => void;
  createProject: (name?: string) => WorkspaceProject;
  removeProject: (id: string) => Promise<void>;
  updateActiveProject: (patch: Partial<Pick<WorkspaceProject, "name" | "description" | "accent" | "activeSurface" | "coverAssetId">>) => void;
  addAsset: (asset: VisualAsset, title?: string) => void;
  removeAsset: (assetId: string) => void;
  toggleAsset: (asset: VisualAsset, title?: string) => void;
  hasAsset: (assetId: string) => boolean;
  linkResource: (surface: Extract<WorkspaceSurface, "studio" | "story">, id: string) => void;
  importProject: (project: WorkspaceProject) => void;
};

const WorkspaceProjectContext = createContext<WorkspaceProjectContextValue | null>(null);

async function createInitialProject() {
  const project = createWorkspaceProject();
  const legacyIds = (() => {
    try {
      const parsed = JSON.parse(safeLocalStorage.getItem(LEGACY_EXHIBITION_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    } catch {
      return [];
    }
  })();
  if (!legacyIds.length) return project;
  const { visualAssetById } = await import("../data/visual-assets");
  return legacyIds.reduce((current, id) => {
    const asset = visualAssetById.get(id);
    return asset ? addWorkspaceAsset(current, toWorkspaceAsset(asset)) : current;
  }, project);
}

export function WorkspaceProjectProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState(() => safeLocalStorage.getItem(ACTIVE_PROJECT_KEY));

  useEffect(() => {
    let cancelled = false;
    void listWorkspaceProjects().then(async (storedProjects) => {
      const nextProjects = storedProjects.length ? storedProjects : [await createInitialProject()];
      if (!storedProjects.length) await saveWorkspaceProject(nextProjects[0]);
      if (cancelled) return;
      const requestedId = activeProjectId;
      const nextActiveId = nextProjects.some((project) => project.id === requestedId) ? requestedId! : nextProjects[0].id;
      setProjects(nextProjects);
      setActiveProjectIdState(nextActiveId);
      safeLocalStorage.setItem(ACTIVE_PROJECT_KEY, nextActiveId);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;

  const commit = useCallback((project: WorkspaceProject) => {
    setProjects((current) => [project, ...current.filter((entry) => entry.id !== project.id)]);
    void saveWorkspaceProject(project);
  }, []);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    safeLocalStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }, []);

  const createProject = useCallback((name?: string) => {
    const project = createWorkspaceProject({ name });
    commit(project);
    setActiveProjectId(project.id);
    return project;
  }, [commit, setActiveProjectId]);

  const removeProject = useCallback(async (id: string) => {
    await deleteWorkspaceProject(id);
    setProjects((current) => {
      const remaining = current.filter((project) => project.id !== id);
      if (remaining.length) {
        if (id === activeProjectId) setActiveProjectId(remaining[0].id);
        return remaining;
      }
      const replacement = createWorkspaceProject();
      void saveWorkspaceProject(replacement);
      setActiveProjectId(replacement.id);
      return [replacement];
    });
  }, [activeProjectId, setActiveProjectId]);

  const updateActiveProject = useCallback((patch: Partial<Pick<WorkspaceProject, "name" | "description" | "accent" | "activeSurface" | "coverAssetId">>) => {
    if (activeProject) commit(updateWorkspaceProject(activeProject, patch));
  }, [activeProject, commit]);

  const addAsset = useCallback((asset: VisualAsset, title?: string) => {
    if (activeProject) commit(addWorkspaceAsset(activeProject, toWorkspaceAsset(asset, title)));
  }, [activeProject, commit]);

  const removeAsset = useCallback((assetId: string) => {
    if (activeProject) commit(removeWorkspaceAsset(activeProject, assetId));
  }, [activeProject, commit]);

  const hasAsset = useCallback((assetId: string) => Boolean(activeProject?.assets.some((asset) => asset.assetId === assetId)), [activeProject]);

  const toggleAsset = useCallback((asset: VisualAsset, title?: string) => {
    if (!activeProject) return;
    commit(hasAsset(asset.id) ? removeWorkspaceAsset(activeProject, asset.id) : addWorkspaceAsset(activeProject, toWorkspaceAsset(asset, title)));
  }, [activeProject, commit, hasAsset]);

  const linkResource = useCallback((surface: Extract<WorkspaceSurface, "studio" | "story">, id: string) => {
    if (activeProject) commit(linkWorkspaceResource(activeProject, surface, id));
  }, [activeProject, commit]);

  const importProject = useCallback((project: WorkspaceProject) => {
    commit(project);
    setActiveProjectId(project.id);
  }, [commit, setActiveProjectId]);

  const value = useMemo<WorkspaceProjectContextValue>(() => ({
    ready,
    projects,
    activeProject,
    setActiveProjectId,
    createProject,
    removeProject,
    updateActiveProject,
    addAsset,
    removeAsset,
    toggleAsset,
    hasAsset,
    linkResource,
    importProject,
  }), [ready, projects, activeProject, setActiveProjectId, createProject, removeProject, updateActiveProject, addAsset, removeAsset, toggleAsset, hasAsset, linkResource, importProject]);

  return <WorkspaceProjectContext.Provider value={value}>{children}</WorkspaceProjectContext.Provider>;
}

export function useWorkspaceProjects() {
  const context = useContext(WorkspaceProjectContext);
  if (!context) throw new Error("useWorkspaceProjects must be used within WorkspaceProjectProvider");
  return context;
}
