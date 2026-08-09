import { forwardRef, useEffect } from "react";
import { createCompositionSlots, getCompositionSize, type CompositionMode } from "../lib/composition-layout";
import { loadDecodedImage } from "../lib/image-decode-queue";
import {
  DEFAULT_COMPOSITION_ADJUSTMENTS,
  DEFAULT_COMPOSITION_CROP,
  DEFAULT_COMPOSITION_TRANSFORM,
  type CompositionArtboardPreset,
  type CompositionImage,
  type CompositionTextAlign,
} from "../types/composition";

export type { CompositionImage } from "../types/composition";

type CompositionCanvasProps = {
  mode: CompositionMode;
  images: CompositionImage[];
  title: string;
  caption: string;
  paperColor: string;
  inkColor: string;
  textAlign?: CompositionTextAlign;
  titleScale?: number;
  artboardPreset?: CompositionArtboardPreset;
  onRendered?: () => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, source: CompositionImage) {
  const transform = { ...DEFAULT_COMPOSITION_TRANSFORM, ...source.transform };
  const crop = { ...DEFAULT_COMPOSITION_CROP, ...source.crop };
  const cropX = image.naturalWidth * clamp(crop.x, 0, 0.95);
  const cropY = image.naturalHeight * clamp(crop.y, 0, 0.95);
  const cropWidth = image.naturalWidth * clamp(crop.width, 0.05, 1 - crop.x);
  const cropHeight = image.naturalHeight * clamp(crop.height, 0.05, 1 - crop.y);
  const scale = Math.max(width / cropWidth, height / cropHeight);
  const sourceWidth = width / (scale * transform.zoom);
  const sourceHeight = height / (scale * transform.zoom);
  const maxX = Math.max(0, cropWidth - sourceWidth);
  const maxY = Math.max(0, cropHeight - sourceHeight);
  const sourceX = cropX + clamp(maxX * (0.5 + transform.offsetX / 2), 0, maxX);
  const sourceY = cropY + clamp(maxY * (0.5 + transform.offsetY / 2), 0, maxY);
  const adjustments = { ...DEFAULT_COMPOSITION_ADJUSTMENTS, ...source.adjustments };
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, source.opacity ?? 1));
  context.globalCompositeOperation = source.blendMode ?? "source-over";
  context.beginPath();
  if (source.mask === "circle") context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  else if (source.mask === "rounded") context.roundRect(x, y, width, height, Math.min(width, height) * 0.12);
  else context.rect(x, y, width, height);
  context.clip();
  context.translate(x + width / 2, y + height / 2);
  context.rotate((transform.rotation * Math.PI) / 180);
  context.filter = `brightness(${adjustments.brightness}) contrast(${adjustments.contrast}) saturate(${adjustments.saturation}) blur(${adjustments.blur}px)`;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, -width / 2, -height / 2, width, height);
  context.filter = "none";
  if (adjustments.temperature !== 0) {
    context.globalCompositeOperation = "soft-light";
    context.globalAlpha = Math.min(0.28, Math.abs(adjustments.temperature) * 0.24);
    context.fillStyle = adjustments.temperature > 0 ? "#ffb45f" : "#76b8e8";
    context.fillRect(-width / 2, -height / 2, width, height);
  }
  context.restore();
}

function drawPerforations(context: CanvasRenderingContext2D, width: number, height: number, paperColor: string) {
  context.fillStyle = paperColor;
  for (let x = 30; x < width - 30; x += 54) {
    context.fillRect(x, 30, 28, 52);
    context.fillRect(x, height - 82, 28, 52);
  }
}

export const CompositionCanvas = forwardRef<HTMLCanvasElement, CompositionCanvasProps>(function CompositionCanvas({
  mode,
  images,
  title,
  caption,
  paperColor,
  inkColor,
  textAlign = "left",
  titleScale = 1,
  artboardPreset = "auto",
  onRendered,
}, ref) {
  const size = getCompositionSize(mode, artboardPreset);
  const baseSize = getCompositionSize(mode);

  useEffect(() => {
    const canvas = typeof ref === "object" && ref ? ref.current : null;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let cancelled = false;

    async function render(context: CanvasRenderingContext2D) {
      const loaded = (await Promise.all(images.filter((source) => source.visible !== false).map(async (source) => {
        try {
          return { image: await loadDecodedImage(source.src), source };
        } catch {
          return null;
        }
      }))).filter((entry): entry is { image: HTMLImageElement; source: CompositionImage } => entry !== null);
      if (cancelled) return;

      context.save();
      context.clearRect(0, 0, size.width, size.height);
      context.scale(size.width / baseSize.width, size.height / baseSize.height);
      context.fillStyle = mode === "filmstrip" ? inkColor : paperColor;
      context.fillRect(0, 0, baseSize.width, baseSize.height);

      const slots = createCompositionSlots(mode, loaded.length || 1);
      slots.forEach((slot, index) => {
        const imageIndex = index % Math.max(loaded.length, 1);
        const loadedFrame = loaded[imageIndex];
        const image = loadedFrame?.image;
        const source = loadedFrame?.source;
        context.save();
        context.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
        context.rotate((slot.rotation * Math.PI) / 180);
        context.translate(-slot.width / 2, -slot.height / 2);
        context.fillStyle = "rgba(255,255,255,0.68)";
        context.fillRect(-12, -12, slot.width + 24, slot.height + 24);
        if (image && source) drawCover(context, image, 0, 0, slot.width, slot.height, source);
        context.restore();
      });

      if (mode === "filmstrip") drawPerforations(context, size.width, size.height, paperColor);

      context.fillStyle = mode === "filmstrip" ? paperColor : inkColor;
      context.textBaseline = "alphabetic";
      context.font = `700 ${Math.round(52 * titleScale)}px Nunito, system-ui, sans-serif`;
      const titleY = mode === "postcard" ? 940 : baseSize.height - 72;
      context.textAlign = textAlign;
      const textX = textAlign === "left" ? 72 : textAlign === "right" ? baseSize.width - 72 : baseSize.width / 2;
      context.fillText(title || "NHB / UNTITLED STUDY", textX, titleY, baseSize.width - 144);
      context.globalAlpha = 0.72;
      context.font = "500 25px Nunito, system-ui, sans-serif";
      context.fillText(caption || "LIGHT / PLACE / SMALL MOMENTS", textX, titleY + 48, baseSize.width - 148);
      context.globalAlpha = 1;
      context.font = "700 18px Nunito, system-ui, sans-serif";
      context.textAlign = "right";
      context.fillText(`NHB / ${mode.toUpperCase()} / ${new Date().getFullYear()}`, baseSize.width - 72, titleY + 46);
      context.restore();
      onRendered?.();
    }

    void render(context);
    return () => { cancelled = true; };
  }, [artboardPreset, baseSize.height, baseSize.width, caption, images, inkColor, mode, onRendered, paperColor, ref, size.height, size.width, textAlign, title, titleScale]);

  return <canvas ref={ref} width={size.width} height={size.height} aria-label="NHB composition preview" />;
});
