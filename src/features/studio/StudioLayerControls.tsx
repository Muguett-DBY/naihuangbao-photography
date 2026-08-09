import { Eye, EyeOff, Layers3 } from "lucide-react";
import type { CompositionBlendMode, CompositionImage } from "../../types/composition";

const blendModes: Array<{ value: CompositionBlendMode; label: string }> = [
  { value: "source-over", label: "NORMAL" },
  { value: "multiply", label: "MULTIPLY" },
  { value: "screen", label: "SCREEN" },
  { value: "soft-light", label: "SOFT LIGHT" },
];

export function StudioLayerControls({ image, onChange }: {
  image: CompositionImage;
  onChange: (patch: Pick<CompositionImage, "visible" | "opacity" | "blendMode">) => void;
}) {
  const visible = image.visible !== false;
  return (
    <div className="studio-layer-controls">
      <div>
        <span><Layers3 size={15} aria-hidden="true" /> ACTIVE LAYER</span>
        <button type="button" onClick={() => onChange({ visible: !visible, opacity: image.opacity ?? 1, blendMode: image.blendMode ?? "source-over" })} aria-label={visible ? "隐藏当前图层" : "显示当前图层"} title={visible ? "隐藏当前图层" : "显示当前图层"}>
          {visible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
        </button>
      </div>
      <label><span>OPACITY <output>{Math.round((image.opacity ?? 1) * 100)}%</output></span><input type="range" min="0.1" max="1" step="0.01" value={image.opacity ?? 1} onChange={(event) => onChange({ visible, opacity: Number(event.target.value), blendMode: image.blendMode ?? "source-over" })} /></label>
      <label><span>BLEND</span><select value={image.blendMode ?? "source-over"} onChange={(event) => onChange({ visible, opacity: image.opacity ?? 1, blendMode: event.target.value as CompositionBlendMode })}>{blendModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
    </div>
  );
}
