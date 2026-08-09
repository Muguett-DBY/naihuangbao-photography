import type { CSSProperties } from "react";
import { ImageWithFallback } from "../ImageWithFallback";
import { interpolateLayerValue } from "../../lib/creative-document-store";
import type { CreativeAspect, CreativeScene } from "../../types/creative-document";

const aspectRatios: Record<CreativeAspect, string> = {
  landscape: "16 / 10",
  portrait: "4 / 5",
  square: "1 / 1",
  story: "9 / 16",
};

export function applySceneProgress(container: HTMLElement, scene: CreativeScene, progress: number) {
  for (const layer of scene.layers) {
    const element = container.querySelector<HTMLElement>(`[data-composer-layer="${layer.id}"]`);
    if (!element) continue;
    const x = interpolateLayerValue(layer, "x", progress);
    const y = interpolateLayerValue(layer, "y", progress);
    const scale = interpolateLayerValue(layer, "scale", progress);
    const rotation = interpolateLayerValue(layer, "rotation", progress);
    const opacity = interpolateLayerValue(layer, "opacity", progress);
    element.style.transform = `translate3d(${x}%, ${y}%, 0) scale(${scale}) rotate(${rotation}deg)`;
    element.style.opacity = String(opacity);
  }
  container.style.setProperty("--composer-playhead", String(progress));
}

export function SceneComposerPreview({ scene, aspect, selectedLayerId, onSelectLayer }: {
  scene: CreativeScene;
  aspect: CreativeAspect;
  selectedLayerId: string;
  onSelectLayer: (id: string) => void;
}) {
  return (
    <div className={`scene-composer-preview transition-${scene.transition}`} style={{ aspectRatio: aspectRatios[aspect], background: scene.background }} data-composer-preview>
      <div className="scene-composer-preview__grid" aria-hidden="true" />
      {scene.layers.map((layer) => (
        <button
          type="button"
          key={layer.id}
          className={`scene-composer-preview__layer ${selectedLayerId === layer.id ? "is-selected" : ""}`}
          data-composer-layer={layer.id}
          onClick={() => onSelectLayer(layer.id)}
          style={{
            transform: `translate3d(${layer.x}%, ${layer.y}%, 0) scale(${layer.scale}) rotate(${layer.rotation}deg)`,
            opacity: layer.opacity,
            mixBlendMode: layer.blendMode,
          } as CSSProperties}
          aria-label={`Select ${layer.name}`}
        >
          {layer.asset ? <ImageWithFallback src={layer.asset.src} alt={layer.asset.alt} title={layer.asset.title} sizes="70vw" priority tone="ink" /> : <span className="scene-composer-preview__empty">DROP / SELECT A FRAME</span>}
        </button>
      ))}
      <div className="scene-composer-preview__playhead" aria-hidden="true" />
      <footer><span>{scene.name}</span><span>{(scene.durationMs / 1000).toFixed(1)} SEC</span></footer>
    </div>
  );
}
