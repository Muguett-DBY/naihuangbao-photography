import "../styles/scene-composer-v8.css";
import { Copy, FolderOpen, Pause, Play, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SceneComposerInspector } from "../components/composer/SceneComposerInspector";
import { applySceneProgress, SceneComposerPreview } from "../components/composer/SceneComposerPreview";
import { SceneComposerTimeline } from "../components/composer/SceneComposerTimeline";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { useSEO } from "../hooks/useSEO";
import {
  createCreativeDocument,
  createCreativeLayer,
  createCreativeScene,
  deleteCreativeDocument,
  duplicateCreativeScene,
  listCreativeDocuments,
  moveCreativeScene,
  saveCreativeDocument,
  upsertCreativeKeyframe,
} from "../lib/creative-document-store";
import type { CreativeDocument, CreativeKeyframeProperty, CreativeLayer, CreativeScene } from "../types/creative-document";
import { useWorkspaceCopy } from "../i18n/workspace-copy";

const aspectLabels = {
  landscape: "aspectLandscape",
  portrait: "aspectPortrait",
  square: "aspectSquare",
  story: "aspectStory",
} as const;

export function SceneComposerPage() {
  const { text } = useWorkspaceCopy();
  useSEO({ title: text("creativeDocument"), descKey: "platform.routes.composer", path: "/compose" });
  const workspace = useWorkspaceProjects();
  const project = workspace.activeProject;
  const previewShellRef = useRef<HTMLDivElement>(null);
  const lastPlayheadRender = useRef(0);
  const [documents, setDocuments] = useState<CreativeDocument[]>([]);
  const [document, setDocument] = useState<CreativeDocument | null>(null);
  const [activeSceneId, setActiveSceneId] = useState("");
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [saved, setSaved] = useState(true);

  const openDocument = useCallback((next: CreativeDocument) => {
    setDocument(next);
    setActiveSceneId(next.scenes[0]?.id ?? "");
    setSelectedLayerId(next.scenes[0]?.layers[0]?.id ?? "");
    setPlayhead(0);
    setPlaying(false);
    setSaved(true);
  }, []);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    void listCreativeDocuments(project.id).then(async (stored) => {
      const next = stored[0] ?? createCreativeDocument(project);
      if (!stored.length) await saveCreativeDocument(next);
      if (cancelled) return;
      setDocuments(stored.length ? stored : [next]);
      openDocument(next);
      workspace.linkResource("composer", next.id);
    }).catch((error) => {
      console.warn("Scene Composer storage is unavailable; continuing in memory", error);
      const next = createCreativeDocument(project);
      if (cancelled) return;
      setDocuments([next]);
      openDocument(next);
      workspace.linkResource("composer", next.id);
    });
    return () => { cancelled = true; };
  }, [project?.id]);

  useEffect(() => {
    if (!document || saved) return;
    const timeout = window.setTimeout(() => {
      void saveCreativeDocument(document).then(() => {
        setDocuments((current) => [document, ...current.filter((entry) => entry.id !== document.id)]);
        setSaved(true);
      }).catch((error) => console.warn("Scene Composer could not persist this change", error));
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [document, saved]);

  const activeScene = document?.scenes.find((scene) => scene.id === activeSceneId) ?? document?.scenes[0] ?? null;
  const selectedLayer = activeScene?.layers.find((layer) => layer.id === selectedLayerId) ?? activeScene?.layers[0] ?? null;

  const mutateDocument = (change: (current: CreativeDocument) => CreativeDocument) => {
    setDocument((current) => current ? { ...change(current), updatedAt: Date.now() } : current);
    setSaved(false);
  };

  const mutateScene = (change: (scene: CreativeScene) => CreativeScene) => {
    if (!activeScene) return;
    mutateDocument((current) => ({ ...current, scenes: current.scenes.map((scene) => scene.id === activeScene.id ? change(scene) : scene) }));
  };

  const updateLayer = (patch: Partial<CreativeLayer>) => {
    if (!selectedLayer) return;
    mutateScene((scene) => ({ ...scene, layers: scene.layers.map((layer) => layer.id === selectedLayer.id ? { ...layer, ...patch } : layer) }));
  };

  const selectScene = (sceneId: string) => {
    const scene = document?.scenes.find((entry) => entry.id === sceneId);
    setActiveSceneId(sceneId);
    setSelectedLayerId(scene?.layers[0]?.id ?? "");
    setPlayhead(0);
  };

  const activateScene = (scene: CreativeScene) => {
    setActiveSceneId(scene.id);
    setSelectedLayerId(scene.layers[0]?.id ?? "");
    setPlayhead(0);
  };

  useEffect(() => {
    if (!playing || !activeScene || !document || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now() - playhead * activeScene.durationMs;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / activeScene.durationMs);
      const preview = previewShellRef.current?.querySelector<HTMLElement>("[data-composer-preview]");
      if (preview) applySceneProgress(preview, activeScene, progress);
      if (now - lastPlayheadRender.current > 90 || progress === 1) {
        lastPlayheadRender.current = now;
        setPlayhead(progress);
      }
      if (progress >= 1) {
        const index = document.scenes.findIndex((scene) => scene.id === activeScene.id);
        const next = document.scenes[index + 1];
        if (next) selectScene(next.id);
        else { setPlaying(false); setPlayhead(0); }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, activeScene?.id, document?.id]);

  const addScene = () => {
    if (!document) return;
    const asset = project?.assets[document.scenes.length % Math.max(1, project.assets.length)] ?? null;
    const scene = createCreativeScene(asset, document.scenes.length);
    mutateDocument((current) => ({ ...current, scenes: [...current.scenes, scene] }));
    activateScene(scene);
  };

  const duplicateScene = (sceneId: string) => {
    const source = document?.scenes.find((scene) => scene.id === sceneId);
    if (!source) return;
    const copy = duplicateCreativeScene(source);
    mutateDocument((current) => ({ ...current, scenes: [...current.scenes, copy] }));
    activateScene(copy);
  };

  const deleteScene = (sceneId: string) => {
    if (!document || !activeScene) return;
    let scenes = document.scenes.filter((scene) => scene.id !== sceneId);
    if (!scenes.length) scenes = [createCreativeScene(project?.assets[0] ?? null)];
    mutateDocument((current) => ({ ...current, scenes }));
    if (sceneId === activeScene.id) activateScene(scenes[0]);
  };

  const createDocument = () => {
    if (!project) return;
    const next = createCreativeDocument(project);
    setDocuments((current) => [next, ...current]);
    openDocument(next);
    setSaved(false);
    workspace.linkResource("composer", next.id);
  };

  const totalDuration = useMemo(() => document?.scenes.reduce((sum, scene) => sum + scene.durationMs, 0) ?? 0, [document?.scenes]);

  if (!project || !document || !activeScene || !selectedLayer) return <div className="scene-composer-loading" role="status">{text("composerLoading")}</div>;

  return (
    <div className="scene-composer" data-scene-composer="v8">
      <header className="scene-composer__bar">
        <div><span>NHB / SCENE COMPOSER / V8</span><strong>{saved ? text("savedLocally") : text("saving")}</strong></div>
        <select aria-label={text("creativeDocument")} value={document.id} onChange={(event) => { const next = documents.find((entry) => entry.id === event.target.value); if (next) openDocument(next); }}>{documents.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
        <div className="scene-composer__bar-actions">
          <button type="button" onClick={createDocument} title={text("newDocument")}><Plus size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => void saveCreativeDocument(document).then(() => setSaved(true)).catch((error) => console.warn("Scene Composer save failed", error))} title={text("save")}><Save size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => void deleteCreativeDocument(document.id).then(() => { const remaining = documents.filter((entry) => entry.id !== document.id); if (remaining[0]) { setDocuments(remaining); openDocument(remaining[0]); } else createDocument(); }).catch((error) => console.warn("Scene Composer delete failed", error))} title={text("deleteDocument")}><Trash2 size={17} aria-hidden="true" /></button>
        </div>
      </header>

      <section className="scene-composer__stage">
        <aside className="scene-composer__project">
          <span>{text("activeProject")}</span><h1>{project.name}</h1><p>{project.description}</p>
          <div><FolderOpen size={17} aria-hidden="true" /><strong>{project.assets.length}</strong><small>{text("availableFrames")}</small></div>
          <div><Copy size={17} aria-hidden="true" /><strong>{document.scenes.length}</strong><small>{text("directedScenes")}</small></div>
          <footer>{text("secondsShort", { seconds: (totalDuration / 1000).toFixed(1) })} / {text(aspectLabels[document.aspect])}</footer>
        </aside>

        <div className="scene-composer__canvas">
          <header>
            <div className="scene-composer__aspects">{(["landscape", "portrait", "square", "story"] as const).map((aspect) => <button type="button" key={aspect} className={document.aspect === aspect ? "is-active" : undefined} onClick={() => mutateDocument((current) => ({ ...current, aspect }))}>{text(aspectLabels[aspect])}</button>)}</div>
            <button type="button" className="scene-composer__play" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}{playing ? text("pause") : text("playStudy")}</button>
          </header>
          <div ref={previewShellRef} className="scene-composer__preview-shell"><SceneComposerPreview scene={activeScene} aspect={document.aspect} selectedLayerId={selectedLayer.id} onSelectLayer={setSelectedLayerId} /></div>
        </div>

        <SceneComposerInspector
          scene={activeScene}
          selectedLayer={selectedLayer}
          assets={project.assets}
          playhead={playhead}
          onUpdateScene={(patch) => mutateScene((scene) => ({ ...scene, ...patch }))}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={updateLayer}
          onAddLayer={(asset) => { const layer = createCreativeLayer(asset, activeScene.layers.length); mutateScene((scene) => ({ ...scene, layers: [...scene.layers, layer] })); setSelectedLayerId(layer.id); }}
          onKeyframe={(property: CreativeKeyframeProperty) => updateLayer(upsertCreativeKeyframe(selectedLayer, property, playhead))}
        />
      </section>

      <SceneComposerTimeline
        scenes={document.scenes}
        activeSceneId={activeScene.id}
        onSelect={selectScene}
        onAdd={addScene}
        onDuplicate={duplicateScene}
        onMove={(sceneId, direction) => mutateDocument((current) => ({ ...current, scenes: moveCreativeScene(current.scenes, sceneId, direction) }))}
        onDelete={deleteScene}
      />
    </div>
  );
}
