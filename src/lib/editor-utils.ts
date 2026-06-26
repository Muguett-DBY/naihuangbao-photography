/**
 * Standalone utility functions extracted from PhotoEditorPage.
 * Pure functions — no React dependencies.
 */
import { FRAMES } from "../data/editor-constants";
import type { BeautySettings } from "../types/photo-editor";

/** 68-point face landmarks — array of {x, y} coordinates */
export type Landmarks = { x: number; y: number }[];

/**
 * Detect face landmarks using face-api.js.
 * Returns 68-point landmarks array, or null if no face is detected.
 */
export async function detectFaceLandmarks(
  api: typeof import("face-api.js"),
  canvas: HTMLCanvasElement,
): Promise<Landmarks | null> {
  const detection = await api
    .detectSingleFace(canvas, new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
    .withFaceLandmarks();
  if (!detection) return null;
  return detection.landmarks.positions;
}

// ── Warp Distortion ──

export function applyWarp(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  fL: number,
  fR: number,
  fT: number,
  fB: number,
  strength: number,
  axis: "horizontal" | "vertical",
) {
  const tmp = new Uint8ClampedArray(d);
  const range = axis === "horizontal" ? (fR - fL) / 2 : (fB - fT) / 2;
  if (range === 0) return;
  for (let y = fT; y < fB; y++) {
    for (let x = fL; x < fR; x++) {
      const dist = axis === "horizontal" ? (x - cx) / range : (y - cy) / range;
      const warp = 1 - strength * dist * dist;
      const sx = axis === "horizontal" ? Math.round(cx + (x - cx) * warp) : x;
      const sy = axis === "vertical" ? Math.round(cy + (y - cy) * warp) : y;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const di = (y * w + x) * 4;
        const si = (sy * w + sx) * 4;
        tmp[di] = d[si];
        tmp[di + 1] = d[si + 1];
        tmp[di + 2] = d[si + 2];
      }
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = tmp[i];
}

// ── Frame Rendering ──

export function applyFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frameId: string) {
  const frame = FRAMES.find((f) => f.id === frameId);
  if (!frame || frameId === "none") return;
  const w = canvas.width;
  const h = canvas.height;
  const pad = frame.padding || 0;
  const padBottom = (frame as { paddingBottom?: number }).paddingBottom ?? pad;

  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = w;
  tmpCanvas.height = h;
  const tmpCtx = tmpCanvas.getContext("2d");
  if (!tmpCtx) return;
  tmpCtx.drawImage(canvas, 0, 0);

  ctx.fillStyle = frame.bg || "transparent";
  ctx.fillRect(0, 0, w, h);

  if (frame.borderRadius) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, frame.borderRadius);
    ctx.clip();
    ctx.fillStyle = frame.bg || "transparent";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(tmpCanvas, pad, pad, w - pad * 2, h - pad - padBottom);
    ctx.restore();
  } else {
    ctx.drawImage(tmpCanvas, pad, pad, w - pad * 2, h - pad - padBottom);
  }
}

// ── Auto-Enhance Analysis ──

export function analyzeFaceAndCalcParams(canvas: HTMLCanvasElement, lm: Landmarks): BeautySettings {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const lEye = lm.slice(36, 42);
  const rEye = lm.slice(42, 48);
  const nose = lm.slice(27, 36);

  const fL = Math.min(...lm.map((p) => p.x));
  const fR = Math.max(...lm.map((p) => p.x));
  const fT = Math.min(...lm.map((p) => p.y));
  const fB = Math.max(...lm.map((p) => p.y));
  const faceW = fR - fL;
  const faceH = fB - fT;
  const aspectRatio = faceW / faceH;

  const eyeW = Math.max(...rEye.map((p) => p.x)) - Math.min(...lEye.map((p) => p.x));
  const eyeRatio = eyeW / faceW;

  const noseW = Math.max(...nose.map((p) => p.x)) - Math.min(...nose.map((p) => p.x));
  const noseRatio = noseW / faceW;

  const cx = (fL + fR) / 2;
  const cy = (fT + fB) / 2;
  const sampleR = Math.min(faceW, faceH) * 0.2;
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;
  const brightnesses: number[] = [];

  for (let y = cy - sampleR; y < cy + sampleR; y += 3) {
    for (let x = cx - sampleR; x < cx + sampleR; x += 3) {
      const ppx = Math.round(x);
      const ppy = Math.round(y);
      if (ppx < 0 || ppx >= w || ppy < 0 || ppy >= h) continue;
      const idx = (ppy * w + ppx) * 4;
      brightnesses.push(0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2]);
    }
  }

  const avgBrightness = brightnesses.length > 0 ? brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length : 128;
  const variance =
    brightnesses.length > 1
      ? brightnesses.reduce((s, v) => s + (v - avgBrightness) ** 2, 0) / brightnesses.length
      : 400;

  return {
    smooth: variance > 800 ? 65 : variance > 400 ? 55 : 45,
    slim: 0,
    bigeye: 0,
    whiten: avgBrightness < 100 ? 40 : avgBrightness < 140 ? 25 : 15,
    sharpen: 12,
    nose: noseRatio > 0.35 ? 15 : 8,
    lip: 15,
    forehead: 30,
    eyebag: 25,
    darkcircle: 20,
    blemish: 0,
    facelift: 10,
    jawline: aspectRatio > 0.7 ? 12 : 5,
    faceWidth: 0,
    eyeDistance: 0,
    faceLength: 0,
    cheekbone: 0,
    chin: 0,
    philtrum: 0,
    temperature: 5,
    saturation: 0,
    contrast: 8,
    brightness: 0,
    vignette: 0,
    grain: 0,
    teeth: 0,
    blur_bg: 0,
    bg_remove: 0,
    bg_solid: 0,
    bg_gradient: 0,
    lipstick: 0,
    blush: 0,
    eyeshadow: 0,
    eyeliner: 0,
    local_bright: 0,
    local_warm: 0,
    local_sat: 0,
    color_splash: 0,
    double_exposure: 0,
  };
}

// ── Skin Detection ──

export function isSkin(
  x: number,
  y: number,
  lEye: Landmarks,
  rEye: Landmarks,
  mouth: Landmarks,
  jaw: Landmarks,
): boolean {
  if (lEye.some((p) => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (rEye.some((p) => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (mouth.some((p) => Math.hypot(p.x - x, p.y - y) < 12)) return false;
  const fL = Math.min(...jaw.map((p) => p.x));
  const fR = Math.max(...jaw.map((p) => p.x));
  const fT = Math.min(...jaw.map((p) => p.y)) - 30;
  const fB = Math.max(...jaw.map((p) => p.y)) + 10;
  return x >= fL && x <= fR && y >= fT && y <= fB;
}
