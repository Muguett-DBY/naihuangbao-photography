import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import type { CreativeScene } from "../../types/creative-document";
import { useWorkspaceCopy, type WorkspaceCopyKey } from "../../i18n/workspace-copy";

const transitionLabels: Record<CreativeScene["transition"], WorkspaceCopyKey> = {
  cut: "transitionCut",
  fade: "transitionFade",
  wipe: "transitionWipe",
  drift: "transitionDrift",
  focus: "transitionFocus",
};

export function SceneComposerTimeline({ scenes, activeSceneId, onSelect, onAdd, onDuplicate, onMove, onDelete }: {
  scenes: CreativeScene[];
  activeSceneId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
}) {
  const { text } = useWorkspaceCopy();
  return (
    <section className="scene-timeline" aria-label={text("sceneTimeline")}>
      <header><span>{text("sceneTimeline")} / {scenes.length}</span><button type="button" onClick={onAdd}><Plus size={15} aria-hidden="true" />{text("addScene")}</button></header>
      <div className="scene-timeline__track">
        {scenes.map((scene, index) => (
          <article key={scene.id} className={scene.id === activeSceneId ? "is-active" : undefined}>
            <button type="button" className="scene-timeline__scene" onClick={() => onSelect(scene.id)}>
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{scene.name}</strong><small>{text(transitionLabels[scene.transition])} / {text("secondsShort", { seconds: (scene.durationMs / 1000).toFixed(1) })}</small>
            </button>
            <div className="scene-timeline__actions">
              <button type="button" title={text("moveSceneLeft")} disabled={index === 0} onClick={() => onMove(scene.id, -1)}><ChevronLeft size={14} aria-hidden="true" /></button>
              <button type="button" title={text("moveSceneRight")} disabled={index === scenes.length - 1} onClick={() => onMove(scene.id, 1)}><ChevronRight size={14} aria-hidden="true" /></button>
              <button type="button" data-action="duplicate-scene" title={text("duplicateScene")} onClick={() => onDuplicate(scene.id)}><Copy size={14} aria-hidden="true" /></button>
              <button type="button" data-action="delete-scene" title={text("deleteScene")} disabled={scenes.length === 1} onClick={() => onDelete(scene.id)}><Trash2 size={14} aria-hidden="true" /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
