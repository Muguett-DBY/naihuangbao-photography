import "../styles/pages.css";
import "../styles/editor.css";
import "../styles/darkroom-v2.css";
import { useEffect } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { PageTransition } from "../components/shared/PageTransition";
import { useExperienceRuntimeBridge } from "../experience/ExperienceProvider";
import { useExperiencePause } from "../experience/useExperiencePause";
import { PhotoEditorWorkspaceView } from "../features/editor/PhotoEditorWorkspaceView";
import { useEditorActions } from "../features/editor/useEditorActions";
import { useEditorImageEngine } from "../features/editor/useEditorImageEngine";
import { useEditorProjectLifecycle } from "../features/editor/useEditorProjectLifecycle";
import { useEditorState } from "../features/editor/useEditorState";
import { useSEO } from "../hooks/useSEO";
import type { EditorProjectSnapshot } from "../lib/editor-project-store";

type PhotoEditorWorkspaceProps = {
  initialFile?: File | null;
  initialProject?: EditorProjectSnapshot | null;
  skipInitialFaceDetection?: boolean;
};

export default function PhotoEditorWorkspace({
  initialFile = null,
  initialProject = null,
  skipInitialFaceDetection = false,
}: PhotoEditorWorkspaceProps) {
  const runtimeBridge = useExperienceRuntimeBridge();
  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });
  useExperiencePause("editor", true);
  useEffect(() => {
    runtimeBridge.releaseTransientTextures();
  }, [runtimeBridge]);

  const state = useEditorState(skipInitialFaceDetection);
  const engine = useEditorImageEngine(state, {
    skipInitialFaceDetection,
    releaseTransientTextures: runtimeBridge.releaseTransientTextures,
  });
  const project = useEditorProjectLifecycle(state, engine, {
    initialFile,
    initialProject,
    skipInitialFaceDetection,
  });
  const actions = useEditorActions(state, engine);

  return (
    <PageTransition>
      <ErrorBoundary>
        <PhotoEditorWorkspaceView state={state} engine={engine} actions={actions} project={project} />
      </ErrorBoundary>
    </PageTransition>
  );
}
