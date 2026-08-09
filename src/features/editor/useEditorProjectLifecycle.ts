import { useCallback, useEffect } from "react";
import {
  createEditorProjectFile,
  getEditorProject,
  parseEditorProjectFile,
  saveEditorProject,
  type EditorProjectSnapshot,
} from "../../lib/editor-project-store";
import type { EditorImageEngine } from "./useEditorImageEngine";
import type { EditorState } from "./useEditorState";
import { setCreativeWorkDirty } from "../../lib/creative-work-state";

type EditorProjectOptions = {
  initialFile: File | null;
  initialProject: EditorProjectSnapshot | null;
  skipInitialFaceDetection: boolean;
};

export function useEditorProjectLifecycle(state: EditorState, engine: EditorImageEngine, options: EditorProjectOptions) {
  useEffect(() => {
    if (options.initialFile) return;
    let active = true;
    void getEditorProject().then((project) => {
      if (active && project) state.setRecoverableProject(project);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [options.initialFile]);

  useEffect(() => {
    if (!options.initialFile || state.initialFileLoadedRef.current === options.initialFile) return;
    state.initialFileLoadedRef.current = options.initialFile;
    engine.loadImageFile(options.initialFile, {
      skipFaceDetection: options.skipInitialFaceDetection,
      project: options.initialProject ?? undefined,
    });
  }, [engine.loadImageFile, options.initialFile, options.initialProject, options.skipInitialFaceDetection]);

  const createProjectSnapshot = useCallback((): EditorProjectSnapshot | null => {
    const source = state.sourceFileRef.current;
    if (!source) return null;
    return {
      id: "autosave",
      version: 1,
      name: source.name.replace(/\.[^.]+$/, "") || "NHB project",
      fileName: source.name,
      source,
      settings: { ...state.settings },
      activeCategory: state.cat,
      activeTool: state.tool,
      activeWorkflow: state.activeWorkflowGroup,
      skipFaceDetection: options.skipInitialFaceDetection,
      history: state.historyRef.current.map((entry) => ({ ...entry })),
      historyIndex: state.historyIdxRef.current,
      frameId: state.frameId,
      texts: state.texts.map((entry) => ({ ...entry })),
      stickers: state.stickers.map((entry) => ({ ...entry })),
      savedAt: Date.now(),
    };
  }, [options.skipInitialFaceDetection, state.activeWorkflowGroup, state.cat, state.frameId, state.settings, state.stickers, state.texts, state.tool]);

  const persistProject = useCallback(async () => {
    const project = createProjectSnapshot();
    if (!project) return;
    state.setProjectStatus("saving");
    setCreativeWorkDirty("editor", true);
    try {
      await saveEditorProject(project);
      state.setRecoverableProject(project);
      state.setProjectStatus("saved");
      setCreativeWorkDirty("editor", false);
    } catch {
      state.setProjectStatus("failed");
    }
  }, [createProjectSnapshot]);

  useEffect(() => {
    if (!state.projectSourceVersion || state.loading) return;
    state.setProjectStatus("saving");
    const timeout = window.setTimeout(() => void persistProject(), 1200);
    return () => window.clearTimeout(timeout);
  }, [persistProject, state.loading, state.projectSourceVersion]);
  useEffect(() => () => setCreativeWorkDirty("editor", false), []);

  const restoreProject = useCallback((project: EditorProjectSnapshot) => {
    const file = new File([project.source], project.fileName, { type: project.source.type, lastModified: project.savedAt });
    state.setRecoverableProject(project);
    engine.loadImageFile(file, { project });
  }, [engine.loadImageFile]);

  const exportProject = useCallback(async () => {
    const project = createProjectSnapshot();
    if (!project) return;
    const blob = await createEditorProjectFile(project);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name}.nhb`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [createProjectSnapshot]);

  const importProject = useCallback(async (file: File) => {
    try {
      restoreProject(await parseEditorProjectFile(file));
    } catch {
      state.setProjectStatus("failed");
    }
  }, [restoreProject]);

  return { createProjectSnapshot, persistProject, restoreProject, exportProject, importProject };
}

export type EditorProjectLifecycle = ReturnType<typeof useEditorProjectLifecycle>;
