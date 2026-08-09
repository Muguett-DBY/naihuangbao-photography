import { Diamond, Eye, EyeOff, Lock, Plus } from "lucide-react";
import { ImageWithFallback } from "../ImageWithFallback";
import type { CreativeKeyframeProperty, CreativeLayer, CreativeScene } from "../../types/creative-document";
import type { WorkspaceAssetReference } from "../../types/workspace-project";

const transformControls: Array<{ property: CreativeKeyframeProperty; label: string; min: number; max: number; step: number }> = [
  { property: "x", label: "Horizontal", min: -100, max: 100, step: 1 },
  { property: "y", label: "Vertical", min: -100, max: 100, step: 1 },
  { property: "scale", label: "Scale", min: 0.2, max: 2.5, step: 0.01 },
  { property: "rotation", label: "Rotation", min: -45, max: 45, step: 1 },
  { property: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01 },
];

export function SceneComposerInspector({ scene, selectedLayer, assets, playhead, onUpdateScene, onSelectLayer, onUpdateLayer, onAddLayer, onKeyframe }: {
  scene: CreativeScene;
  selectedLayer: CreativeLayer;
  assets: WorkspaceAssetReference[];
  playhead: number;
  onUpdateScene: (patch: Partial<CreativeScene>) => void;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (patch: Partial<CreativeLayer>) => void;
  onAddLayer: (asset: WorkspaceAssetReference | null) => void;
  onKeyframe: (property: CreativeKeyframeProperty) => void;
}) {
  return (
    <aside className="scene-inspector">
      <section>
        <header><span>01 / SCENE</span></header>
        <label>Name<input value={scene.name} onChange={(event) => onUpdateScene({ name: event.target.value })} /></label>
        <label>Duration / ms<input type="number" min={800} max={12000} step={100} value={scene.durationMs} onChange={(event) => onUpdateScene({ durationMs: Number(event.target.value) })} /></label>
        <label>Transition<select value={scene.transition} onChange={(event) => onUpdateScene({ transition: event.target.value as CreativeScene["transition"] })}><option value="cut">Cut</option><option value="fade">Fade</option><option value="wipe">Wipe</option><option value="drift">Drift</option><option value="focus">Focus pull</option></select></label>
        <label>Background<input type="color" value={scene.background} onChange={(event) => onUpdateScene({ background: event.target.value })} /></label>
      </section>

      <section>
        <header><span>02 / LAYERS</span><button type="button" onClick={() => onAddLayer(null)}><Plus size={14} aria-hidden="true" />LAYER</button></header>
        <div className="scene-inspector__layers">{scene.layers.map((layer, index) => <button type="button" key={layer.id} className={layer.id === selectedLayer.id ? "is-active" : undefined} onClick={() => onSelectLayer(layer.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{layer.name}</strong>{layer.locked ? <Lock size={13} aria-hidden="true" /> : layer.opacity ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}</button>)}</div>
      </section>

      <section>
        <header><span>03 / TRANSFORM</span><small>AT {Math.round(playhead * 100)}%</small></header>
        {transformControls.map((control) => (
          <div className="scene-inspector__range" key={control.property}>
            <label htmlFor={`composer-${control.property}`}>{control.label}<output>{selectedLayer[control.property].toFixed(control.step < 1 ? 2 : 0)}</output></label>
            <div><input id={`composer-${control.property}`} type="range" min={control.min} max={control.max} step={control.step} value={selectedLayer[control.property]} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer({ [control.property]: Number(event.target.value) })} /><button type="button" title={`Add ${control.label} keyframe`} onClick={() => onKeyframe(control.property)}><Diamond size={13} aria-hidden="true" /></button></div>
          </div>
        ))}
        <label>Blend mode<select value={selectedLayer.blendMode} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer({ blendMode: event.target.value as CreativeLayer["blendMode"] })}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="soft-light">Soft light</option></select></label>
        <button type="button" className="scene-inspector__lock" onClick={() => onUpdateLayer({ locked: !selectedLayer.locked })}><Lock size={14} aria-hidden="true" />{selectedLayer.locked ? "UNLOCK LAYER" : "LOCK LAYER"}</button>
      </section>

      <section>
        <header><span>04 / PROJECT FRAMES</span></header>
        <div className="scene-inspector__assets">{assets.slice(0, 20).map((asset) => <button type="button" key={asset.assetId} onClick={() => onAddLayer(asset)} title={`Add ${asset.title}`}><ImageWithFallback src={asset.src} alt="" title={asset.title} sizes="72px" tone="cream" /><span>{asset.title}</span></button>)}</div>
      </section>
    </aside>
  );
}
