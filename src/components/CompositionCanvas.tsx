import { forwardRef, useEffect } from "react";
import { createCompositionSlots, getCompositionSize, type CompositionMode } from "../lib/composition-layout";
import { loadDecodedImage } from "../lib/image-decode-queue";
import { DEFAULT_COMPOSITION_TRANSFORM, type CompositionImage, type CompositionTextAlign } from "../types/composition";

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
  onRendered?: () => void;
};

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, source: CompositionImage) {
  const transform = { ...DEFAULT_COMPOSITION_TRANSFORM, ...source.transform };
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / (scale * transform.zoom);
  const sourceHeight = height / (scale * transform.zoom);
  const maxX = Math.max(0, image.naturalWidth - sourceWidth);
  const maxY = Math.max(0, image.naturalHeight - sourceHeight);
  const sourceX = Math.max(0, Math.min(maxX, maxX * (0.5 + transform.offsetX / 2)));
  const sourceY = Math.max(0, Math.min(maxY, maxY * (0.5 + transform.offsetY / 2)));
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, source.opacity ?? 1));
  context.globalCompositeOperation = source.blendMode ?? "source-over";
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.translate(x + width / 2, y + height / 2);
  context.rotate((transform.rotation * Math.PI) / 180);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, -width / 2, -height / 2, width, height);
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
  onRendered,
}, ref) {
  const size = getCompositionSize(mode);

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
      context.fillStyle = mode === "filmstrip" ? inkColor : paperColor;
      context.fillRect(0, 0, size.width, size.height);

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
      const titleY = mode === "postcard" ? 940 : size.height - 72;
      context.textAlign = textAlign;
      const textX = textAlign === "left" ? 72 : textAlign === "right" ? size.width - 72 : size.width / 2;
      context.fillText(title || "NHB / UNTITLED STUDY", textX, titleY, size.width - 144);
      context.globalAlpha = 0.72;
      context.font = "500 25px Nunito, system-ui, sans-serif";
      context.fillText(caption || "LIGHT / PLACE / SMALL MOMENTS", textX, titleY + 48, size.width - 148);
      context.globalAlpha = 1;
      context.font = "700 18px Nunito, system-ui, sans-serif";
      context.textAlign = "right";
      context.fillText(`NHB / ${mode.toUpperCase()} / ${new Date().getFullYear()}`, size.width - 72, titleY + 46);
      context.restore();
      onRendered?.();
    }

    void render(context);
    return () => { cancelled = true; };
  }, [caption, images, inkColor, mode, onRendered, paperColor, ref, size.height, size.width, textAlign, title, titleScale]);

  return <canvas ref={ref} width={size.width} height={size.height} aria-label="NHB composition preview" />;
});
