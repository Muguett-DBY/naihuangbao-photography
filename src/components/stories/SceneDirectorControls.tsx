import { Aperture, Clock3, Move3d } from "lucide-react";
import type { SceneMotion, SceneTransition } from "../../types/scene-graph";

const transitions: SceneTransition[] = ["veil", "focus", "drift", "slice", "cut"];

export function SceneDirectorControls({ value, onChange }: { value: SceneMotion; onChange: (motion: SceneMotion) => void }) {
  return (
    <div className="scene-director-controls">
      <header><Aperture size={15} aria-hidden="true" /><strong>SCENE DIRECTOR</strong><small>{value.transition.toUpperCase()}</small></header>
      <div role="group" aria-label="Scene transition">
        {transitions.map((transition) => <button type="button" key={transition} className={value.transition === transition ? "is-active" : undefined} onClick={() => onChange({ ...value, transition })}>{transition.toUpperCase()}</button>)}
      </div>
      <label><span><Clock3 size={13} aria-hidden="true" />DURATION <output>{(value.durationMs / 1000).toFixed(2)}s</output></span><input type="range" min="300" max="2200" step="50" value={value.durationMs} onChange={(event) => onChange({ ...value, durationMs: Number(event.target.value) })} /></label>
      <label><span><Move3d size={13} aria-hidden="true" />MOTION <output>{Math.round(value.intensity * 100)}</output></span><input type="range" min="0" max="1" step="0.01" value={value.intensity} onChange={(event) => onChange({ ...value, intensity: Number(event.target.value) })} /></label>
      <label><span>DEPTH <output>{Math.round(value.depth * 100)}</output></span><input type="range" min="0" max="1" step="0.01" value={value.depth} onChange={(event) => onChange({ ...value, depth: Number(event.target.value) })} /></label>
    </div>
  );
}
