import { RotateCcw } from "lucide-react";
import type { CompositionImage, CompositionImageTransform } from "../../types/composition";
import { DEFAULT_COMPOSITION_TRANSFORM } from "../../types/composition";
import { StudioAdjustmentControls } from "./StudioAdjustmentControls";
import { StudioLayerControls } from "./StudioLayerControls";

export function StudioFrameControls({ image, onTransform, onLayerChange, onLookChange }: {
  image: CompositionImage;
  onTransform: (patch: Partial<CompositionImageTransform>) => void;
  onLayerChange: (patch: Partial<Pick<CompositionImage, "visible" | "opacity" | "blendMode" | "locked" | "groupId">>) => void;
  onLookChange: (patch: Partial<Pick<CompositionImage, "adjustments" | "crop" | "mask">>) => void;
}) {
  const transform = { ...DEFAULT_COMPOSITION_TRANSFORM, ...image.transform };
  return (
    <section className="studio-transform-controls">
      <span className="studio-control-index">03 / FRAME TRANSFORM</span>
      <strong>{image.name}</strong>
      <label><span>ZOOM <output>{transform.zoom.toFixed(2)}×</output></span><input disabled={image.locked} type="range" min="1" max="2.4" step="0.05" value={transform.zoom} onChange={(event) => onTransform({ zoom: Number(event.target.value) })} /></label>
      <label><span>HORIZONTAL <output>{Math.round(transform.offsetX * 100)}</output></span><input disabled={image.locked} type="range" min="-1" max="1" step="0.05" value={transform.offsetX} onChange={(event) => onTransform({ offsetX: Number(event.target.value) })} /></label>
      <label><span>VERTICAL <output>{Math.round(transform.offsetY * 100)}</output></span><input disabled={image.locked} type="range" min="-1" max="1" step="0.05" value={transform.offsetY} onChange={(event) => onTransform({ offsetY: Number(event.target.value) })} /></label>
      <label><span>ROTATE <output>{transform.rotation}°</output></span><input disabled={image.locked} type="range" min="-12" max="12" step="1" value={transform.rotation} onChange={(event) => onTransform({ rotation: Number(event.target.value) })} /></label>
      <StudioLayerControls image={image} onChange={onLayerChange} />
      <StudioAdjustmentControls image={image} onChange={onLookChange} />
      <button type="button" disabled={image.locked} onClick={() => onTransform(DEFAULT_COMPOSITION_TRANSFORM)}><RotateCcw size={15} aria-hidden="true" />RESET FRAME</button>
    </section>
  );
}
