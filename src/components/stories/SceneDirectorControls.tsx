import { Aperture, Clock3, Move3d } from "lucide-react";
import type { SceneMotion, SceneTransition } from "../../types/scene-graph";
import { useWorkspaceCopy, type WorkspaceCopyKey } from "../../i18n/workspace-copy";

const transitions: SceneTransition[] = ["veil", "focus", "drift", "slice", "cut"];
const transitionLabels: Record<SceneTransition, WorkspaceCopyKey> = {
  veil: "transitionVeil",
  focus: "transitionFocus",
  drift: "transitionDrift",
  slice: "transitionSlice",
  cut: "transitionCut",
};

export function SceneDirectorControls({ value, onChange }: { value: SceneMotion; onChange: (motion: SceneMotion) => void }) {
  const { text } = useWorkspaceCopy();
  return (
    <div className="scene-director-controls">
      <header><Aperture size={15} aria-hidden="true" /><strong>{text("sceneDirector")}</strong><small>{text(transitionLabels[value.transition])}</small></header>
      <div role="group" aria-label={text("sceneTransition")}>
        {transitions.map((transition) => <button type="button" key={transition} data-scene-transition={transition} className={value.transition === transition ? "is-active" : undefined} onClick={() => onChange({ ...value, transition })}>{text(transitionLabels[transition])}</button>)}
      </div>
      <label><span><Clock3 size={13} aria-hidden="true" />{text("duration")} <output>{(value.durationMs / 1000).toFixed(2)}s</output></span><input type="range" min="300" max="2200" step="50" value={value.durationMs} onChange={(event) => onChange({ ...value, durationMs: Number(event.target.value) })} /></label>
      <label><span><Move3d size={13} aria-hidden="true" />{text("motion")} <output>{Math.round(value.intensity * 100)}</output></span><input type="range" min="0" max="1" step="0.01" value={value.intensity} onChange={(event) => onChange({ ...value, intensity: Number(event.target.value) })} /></label>
      <label><span>{text("depth")} <output>{Math.round(value.depth * 100)}</output></span><input type="range" min="0" max="1" step="0.01" value={value.depth} onChange={(event) => onChange({ ...value, depth: Number(event.target.value) })} /></label>
    </div>
  );
}
