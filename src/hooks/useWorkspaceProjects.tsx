import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { VisualAsset } from "../types/visual-asset";
import type { WorkspaceAssetReference, WorkspaceProject, WorkspaceProjectEvent, WorkspaceSurface } from "../types/workspace-project";
import { safeLocalStorage } from "../lib/browser-storage";
import {
  addWorkspaceAsset,
  createWorkspaceEvent,
  createWorkspaceProject,
  deleteWorkspaceProject,
  linkWorkspaceResource,
  linkVaultAsset,
  listWorkspaceEvents,
  listWorkspaceProjects,
  removeWorkspaceAsset,
  saveWorkspaceProject,
  saveWorkspaceEvent,
  toWorkspaceAsset,
  updateWorkspaceProject,
} from "../lib/workspace-project-store";

const ACTIVE_PROJECT_KEY = "nhb-active-workspace-project-v1";
const LEGACY_EXHIBITION_KEY = "nhb-archive-exhibition-v1";

type WorkspaceProjectContextValue = {
  ready: boolean;
  persisting: boolean;
  projects: WorkspaceProject[];
  activeProject: WorkspaceProject | null;
  events: WorkspaceProjectEvent[];
  setActiveProjectId: (id: string) => void;
  createProject: (name?: string) => WorkspaceProject;
  removeProject: (id: string) => Promise<void>;
  updateActiveProject: (patch: Partial<Pick<WorkspaceProject, "name" | "description" | "accent" | "activeSurface" | "coverAssetId" | "status" | "exhibition">>) => void;
  addAsset: (asset: VisualAsset, title?: string) => void;
  addAssets: (assets: readonly VisualAsset[]) => void;
  removeAsset: (assetId: string) => void;
  toggleAsset: (asset: VisualAsset, title?: string) => Promise<void>;
  hasAsset: (assetId: string) => boolean;
  linkVaultAsset: (asset: WorkspaceAssetReference) => void;
  linkVaultAssets: (assets: readonly WorkspaceAssetReference[]) => void;
  linkResource: (surface: Extract<WorkspaceSurface, "composer" | "studio" | "story">, id: string) => void;
  checkpoint: (summary: string, surface?: WorkspaceSurface) => void;
  importProject: (project: WorkspaceProject) => void;
};

const WorkspaceProjectContext = createContext<WorkspaceProjectContextValue | null>(null);

function persistInBackground(task: Promise<unknown>) {
  void task.catch((error) => console.warn("Workspace persistence is unavailable; continuing in memory", error));
}

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
  const [pendingProjectWrites, setPendingProjectWrites] = useState(0);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [events, setEvents] = useState<WorkspaceProjectEvent[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState(() => safeLocalStorage.getItem(ACTIVE_PROJECT_KEY));
  const projectWriteQueue = useRef<Promise<void>>(Promise.resolve());

  const persistProject = useCallback((project: WorkspaceProject) => {
    setPendingProjectWrites((count) => count + 1);
    const write = projectWriteQueue.current.then(() => saveWorkspaceProject(project));
    const handled = write
      .catch((error) => console.warn("Workspace persistence is unavailable; continuing in memory", error))
      .finally(() => setPendingProjectWrites((count) => Math.max(0, count - 1)));
    projectWriteQueue.current = handled;
    return handled;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listWorkspaceProjects(), listWorkspaceEvents(undefined, 96)])
      .then(async ([storedProjects, storedEvents]) => {
        const nextProjects = storedProjects.length ? storedProjects : [await createInitialProject()];
        if (!storedProjects.length) void persistProject(nextProjects[0]);
        if (cancelled) return;
        const requestedId = activeProjectId;
        const nextActiveId = nextProjects.some((project) => project.id === requestedId) ? requestedId! : nextProjects[0].id;
        setProjects(nextProjects);
        setEvents(storedEvents);
        setActiveProjectIdState(nextActiveId);
        safeLocalStorage.setItem(ACTIVE_PROJECT_KEY, nextActiveId);
        setReady(true);
      })
      .catch(async (error) => {
        console.warn("Workspace database is unavailable; using an in-memory project", error);
        const project = await createInitialProject();
        if (cancelled) return;
        setProjects([project]);
        setEvents([]);
        setActiveProjectIdState(project.id);
        setReady(true);
      });
    return () => { cancelled = true; };
  }, [persistProject]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;

  const recordEvent = useCallback((project: WorkspaceProject, type: WorkspaceProjectEvent["type"], summary: string, surface?: WorkspaceSurface) => {
    const event = createWorkspaceEvent(project, type, summary, surface);
    setEvents((current) => [event, ...current].slice(0, 96));
    persistInBackground(saveWorkspaceEvent(event));
  }, []);

  const commit = useCallback((project: WorkspaceProject) => {
    setProjects((current) => [project, ...current.filter((entry) => entry.id !== project.id)]);
    return persistProject(project);
  }, [persistProject]);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    safeLocalStorage.setItem(ACTIVE_PROJECT_KEY, id);
    const project = projects.find((entry) => entry.id === id);
    if (project) {
      const opened = updateWorkspaceProject(project, { lastOpenedAt: Date.now() });
      setProjects((current) => [opened, ...current.filter((entry) => entry.id !== id)]);
      void persistProject(opened);
      recordEvent(opened, "opened", `Resumed ${opened.name}`);
    }
  }, [persistProject, projects, recordEvent]);

  const createProject = useCallback((name?: string) => {
    const project = createWorkspaceProject({ name });
    commit(project);
    setActiveProjectId(project.id);
    recordEvent(project, "created", `Created ${project.name}`);
    return project;
  }, [commit, recordEvent, setActiveProjectId]);

  const removeProject = useCallback(async (id: string) => {
    try {
      await deleteWorkspaceProject(id);
    } catch (error) {
      console.warn("Workspace project could not be removed from persistent storage", error);
    }
    setProjects((current) => {
      const remaining = current.filter((project) => project.id !== id);
      if (remaining.length) {
        if (id === activeProjectId) setActiveProjectId(remaining[0].id);
        return remaining;
      }
      const replacement = createWorkspaceProject();
      void persistProject(replacement);
      setActiveProjectId(replacement.id);
      return [replacement];
    });
  }, [activeProjectId, persistProject, setActiveProjectId]);

  const updateActiveProject = useCallback((patch: Partial<Pick<WorkspaceProject, "name" | "description" | "accent" | "activeSurface" | "coverAssetId" | "status" | "exhibition">>) => {
    if (activeProject) commit(updateWorkspaceProject(activeProject, patch));
  }, [activeProject, commit]);

  const addAsset = useCallback((asset: VisualAsset, title?: string) => {
    if (!activeProject) return;
    const next = addWorkspaceAsset(activeProject, toWorkspaceAsset(asset, title));
    if (next === activeProject) return;
    commit(next);
    recordEvent(next, "asset-added", `Added ${title || asset.alt}`, "archive");
  }, [activeProject, commit, recordEvent]);

  const addAssets = useCallback((assets: readonly VisualAsset[]) => {
    if (!activeProject || !assets.length) return;
    const next = assets.reduce((current, asset) => addWorkspaceAsset(current, toWorkspaceAsset(asset)), activeProject);
    if (next === activeProject) return;
    commit(next);
    recordEvent(next, "asset-added", `Curated ${next.assets.length - activeProject.assets.length} frames`, "archive");
  }, [activeProject, commit, recordEvent]);

  const removeAsset = useCallback((assetId: string) => {
    if (!activeProject) return;
    const title = activeProject.assets.find((asset) => asset.assetId === assetId)?.title ?? "frame";
    const next = removeWorkspaceAsset(activeProject, assetId);
    commit(next);
    recordEvent(next, "asset-removed", `Removed ${title}`);
  }, [activeProject, commit, recordEvent]);

  const hasAsset = useCallback((assetId: string) => Boolean(activeProject?.assets.some((asset) => asset.assetId === assetId)), [activeProject]);

  const toggleAsset = useCallback((asset: VisualAsset, title?: string) => {
    if (!activeProject) return Promise.resolve();
    return commit(hasAsset(asset.id) ? removeWorkspaceAsset(activeProject, asset.id) : addWorkspaceAsset(activeProject, toWorkspaceAsset(asset, title)));
  }, [activeProject, commit, hasAsset]);

  const addVaultAsset = useCallback((asset: WorkspaceAssetReference) => {
    if (!activeProject) return;
    const next = linkVaultAsset(activeProject, asset);
    commit(next);
    recordEvent(next, "asset-added", `Imported ${asset.title}`, "vault");
  }, [activeProject, commit, recordEvent]);

  const addVaultAssets = useCallback((assets: readonly WorkspaceAssetReference[]) => {
    if (!activeProject || !assets.length) return;
    const next = assets.reduce((current, asset) => linkVaultAsset(current, asset), activeProject);
    if (next === activeProject) return;
    commit(next);
    recordEvent(next, "asset-added", `Imported ${next.assets.length - activeProject.assets.length} originals`, "vault");
  }, [activeProject, commit, recordEvent]);

  const linkResource = useCallback((surface: Extract<WorkspaceSurface, "composer" | "studio" | "story">, id: string) => {
    if (!activeProject) return;
    const next = linkWorkspaceResource(activeProject, surface, id);
    commit(next);
    recordEvent(next, "resource-linked", `Linked ${surface} output`, surface);
  }, [activeProject, commit, recordEvent]);

  const checkpoint = useCallback((summary: string, surface?: WorkspaceSurface) => {
    if (activeProject) recordEvent(activeProject, "checkpoint", summary, surface);
  }, [activeProject, recordEvent]);

  const importProject = useCallback((project: WorkspaceProject) => {
    commit(project);
    setActiveProjectId(project.id);
    recordEvent(project, "imported", `Imported ${project.name}`);
  }, [commit, recordEvent, setActiveProjectId]);

  const value = useMemo<WorkspaceProjectContextValue>(() => ({
    ready,
    persisting: pendingProjectWrites > 0,
    projects,
    activeProject,
    events: events.filter((event) => event.projectId === activeProject?.id),
    setActiveProjectId,
    createProject,
    removeProject,
    updateActiveProject,
    addAsset,
    addAssets,
    removeAsset,
    toggleAsset,
    hasAsset,
    linkVaultAsset: addVaultAsset,
    linkVaultAssets: addVaultAssets,
    linkResource,
    checkpoint,
    importProject,
  }), [ready, pendingProjectWrites, projects, activeProject, events, setActiveProjectId, createProject, removeProject, updateActiveProject, addAsset, addAssets, removeAsset, toggleAsset, hasAsset, addVaultAsset, addVaultAssets, linkResource, checkpoint, importProject]);

  return <WorkspaceProjectContext.Provider value={value}>{children}</WorkspaceProjectContext.Provider>;
}

export function useWorkspaceProjects() {
  const context = useContext(WorkspaceProjectContext);
  if (!context) throw new Error("useWorkspaceProjects must be used within WorkspaceProjectProvider");
  return context;
}
