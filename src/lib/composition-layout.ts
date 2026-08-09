export type CompositionMode = "filmstrip" | "contact-sheet" | "postcard" | "moodboard";

export type CompositionSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

import type { CompositionArtboardPreset } from "../types/composition";

export type CompositionSize = { width: number; height: number };

export function getCompositionSize(mode: CompositionMode, preset: CompositionArtboardPreset = "auto"): CompositionSize {
  if (preset === "landscape") return { width: 1800, height: 1200 };
  if (preset === "portrait") return { width: 1200, height: 1600 };
  if (preset === "square") return { width: 1400, height: 1400 };
  if (preset === "story") return { width: 1080, height: 1920 };
  if (mode === "filmstrip") return { width: 1800, height: 1000 };
  if (mode === "postcard") return { width: 1600, height: 1100 };
  return { width: 1600, height: 1200 };
}

export function createCompositionSlots(mode: CompositionMode, imageCount: number): CompositionSlot[] {
  const count = Math.max(1, Math.min(imageCount, 12));
  const { width, height } = getCompositionSize(mode);

  if (mode === "filmstrip") {
    const visible = Math.min(count, 6);
    const gap = 24;
    const padding = 72;
    const slotWidth = (width - padding * 2 - gap * (visible - 1)) / visible;
    return Array.from({ length: visible }, (_, index) => ({
      x: padding + index * (slotWidth + gap),
      y: 156,
      width: slotWidth,
      height: height - 312,
      rotation: 0,
    }));
  }

  if (mode === "postcard") {
    return [{ x: 72, y: 72, width: width - 144, height: 760, rotation: 0 }];
  }

  if (mode === "moodboard") {
    const templates = [
      { x: 70, y: 70, width: 880, height: 690, rotation: -1.2 },
      { x: 1010, y: 82, width: 500, height: 430, rotation: 1.4 },
      { x: 965, y: 560, width: 550, height: 570, rotation: -0.8 },
      { x: 100, y: 820, width: 390, height: 310, rotation: 1.1 },
      { x: 535, y: 790, width: 380, height: 340, rotation: -1.5 },
    ];
    return Array.from({ length: Math.min(count, templates.length) }, (_, index) => templates[index]);
  }

  const columns = count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / columns);
  const gap = 28;
  const padding = 64;
  const footer = 150;
  const slotWidth = (width - padding * 2 - gap * (columns - 1)) / columns;
  const slotHeight = (height - padding * 2 - footer - gap * (rows - 1)) / rows;
  return Array.from({ length: count }, (_, index) => ({
    x: padding + (index % columns) * (slotWidth + gap),
    y: padding + Math.floor(index / columns) * (slotHeight + gap),
    width: slotWidth,
    height: slotHeight,
    rotation: 0,
  }));
}
