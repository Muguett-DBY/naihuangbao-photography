import type { CompositionAdjustments, CompositionCrop, CompositionImage, CompositionMask } from "../../types/composition";
import { DEFAULT_COMPOSITION_ADJUSTMENTS, DEFAULT_COMPOSITION_CROP } from "../../types/composition";

const masks: CompositionMask[] = ["none", "rounded", "circle"];
const cropPresets: Array<{ id: string; value: CompositionCrop }> = [
  { id: "FULL", value: DEFAULT_COMPOSITION_CROP },
  { id: "INSET", value: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 } },
  { id: "TALL", value: { x: 0.16, y: 0.03, width: 0.68, height: 0.94 } },
];

type AdjustmentKey = keyof CompositionAdjustments;
const sliders: Array<{ key: AdjustmentKey; label: string; min: number; max: number; step: number }> = [
  { key: "brightness", label: "LIGHT", min: 0.5, max: 1.5, step: 0.01 },
  { key: "contrast", label: "CONTRAST", min: 0.5, max: 1.5, step: 0.01 },
  { key: "saturation", label: "COLOR", min: 0, max: 1.8, step: 0.01 },
  { key: "temperature", label: "WARMTH", min: -1, max: 1, step: 0.01 },
  { key: "blur", label: "SOFTEN", min: 0, max: 6, step: 0.1 },
];

export function StudioAdjustmentControls({ image, onChange }: { image: CompositionImage; onChange: (patch: Partial<Pick<CompositionImage, "adjustments" | "crop" | "mask">>) => void }) {
  const adjustments = { ...DEFAULT_COMPOSITION_ADJUSTMENTS, ...image.adjustments };
  return (
    <div className="studio-adjustment-controls">
      <div className="studio-adjustment-controls__modes" role="group" aria-label="Layer mask">
        {masks.map((mask) => <button type="button" key={mask} className={(image.mask ?? "none") === mask ? "is-active" : undefined} onClick={() => onChange({ mask })}>{mask.toUpperCase()}</button>)}
      </div>
      <div className="studio-adjustment-controls__modes" role="group" aria-label="Crop preset">
        {cropPresets.map((preset) => <button type="button" key={preset.id} onClick={() => onChange({ crop: preset.value })}>{preset.id}</button>)}
      </div>
      {sliders.map((slider) => (
        <label key={slider.key}><span>{slider.label}<output>{adjustments[slider.key].toFixed(slider.key === "blur" ? 1 : 2)}</output></span><input type="range" min={slider.min} max={slider.max} step={slider.step} value={adjustments[slider.key]} onChange={(event) => onChange({ adjustments: { ...adjustments, [slider.key]: Number(event.target.value) } })} /></label>
      ))}
      <button type="button" onClick={() => onChange({ adjustments: DEFAULT_COMPOSITION_ADJUSTMENTS, crop: DEFAULT_COMPOSITION_CROP, mask: "none" })}>RESET LOOK</button>
    </div>
  );
}
