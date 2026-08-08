import { forwardRef, useEffect } from "react";
import { createCompositionSlots, getCompositionSize, type CompositionMode } from "../lib/composition-layout";
import type { CompositionImage } from "../types/composition";

export type { CompositionImage } from "../types/composition";

type CompositionCanvasProps = {
  mode: CompositionMode;
  images: CompositionImage[];
  title: string;
  caption: string;
  paperColor: string;
  inkColor: string;
  onRendered?: () => void;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
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
  onRendered,
}, ref) {
  const size = getCompositionSize(mode);

  useEffect(() => {
    const canvas = typeof ref === "object" && ref ? ref.current : null;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let cancelled = false;

    async function render(context: CanvasRenderingContext2D) {
      const loaded = (await Promise.all(images.map(async (image) => {
        try {
          return await loadImage(image.src);
        } catch {
          return null;
        }
      }))).filter((image): image is HTMLImageElement => image !== null);
      if (cancelled) return;

      context.save();
      context.clearRect(0, 0, size.width, size.height);
      context.fillStyle = mode === "filmstrip" ? inkColor : paperColor;
      context.fillRect(0, 0, size.width, size.height);

      const slots = createCompositionSlots(mode, loaded.length || 1);
      slots.forEach((slot, index) => {
        const image = loaded[index % Math.max(loaded.length, 1)];
        context.save();
        context.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
        context.rotate((slot.rotation * Math.PI) / 180);
        context.translate(-slot.width / 2, -slot.height / 2);
        context.fillStyle = "rgba(255,255,255,0.68)";
        context.fillRect(-12, -12, slot.width + 24, slot.height + 24);
        if (image) drawCover(context, image, 0, 0, slot.width, slot.height);
        context.restore();
      });

      if (mode === "filmstrip") drawPerforations(context, size.width, size.height, paperColor);

      context.fillStyle = mode === "filmstrip" ? paperColor : inkColor;
      context.textBaseline = "alphabetic";
      context.font = "700 52px Nunito, system-ui, sans-serif";
      const titleY = mode === "postcard" ? 940 : size.height - 72;
      context.fillText(title || "NHB / UNTITLED STUDY", 72, titleY, size.width - 144);
      context.globalAlpha = 0.72;
      context.font = "500 25px Nunito, system-ui, sans-serif";
      context.fillText(caption || "LIGHT / PLACE / SMALL MOMENTS", 74, titleY + 48, size.width - 148);
      context.globalAlpha = 1;
      context.font = "700 18px Nunito, system-ui, sans-serif";
      context.textAlign = "right";
      context.fillText(`NHB / ${mode.toUpperCase()} / ${new Date().getFullYear()}`, size.width - 72, titleY + 46);
      context.restore();
      onRendered?.();
    }

    void render(context);
    return () => { cancelled = true; };
  }, [caption, images, inkColor, mode, onRendered, paperColor, ref, size.height, size.width, title]);

  return <canvas ref={ref} width={size.width} height={size.height} aria-label="NHB composition preview" />;
});
