/**
 * Canvas effect callbacks extracted from PhotoEditorPage.
 * Pure functions — no React hooks. Each takes canvas context + params.
 */
import type { BeautySettings } from "../types/photo-editor";
import type { Landmarks } from "./editor-utils";

// ── Background Effects ──

export function applyBackgroundBlur(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  lm: Landmarks,
  intensity: number,
) {
  const w = canvas.width;
  const h = canvas.height;
  const jaw = lm.slice(0, 17);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d")!;
  maskCtx.fillStyle = "white";
  maskCtx.beginPath();
  maskCtx.moveTo(jaw[0].x, jaw[0].y);
  for (let i = 1; i < jaw.length; i++) maskCtx.lineTo(jaw[i].x, jaw[i].y);
  maskCtx.closePath();
  maskCtx.fill();

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = w;
  blurCanvas.height = h;
  const blurCtx = blurCanvas.getContext("2d")!;
  blurCtx.filter = `blur(${Math.round(intensity * 15)}px)`;
  blurCtx.drawImage(canvas, 0, 0);

  const original = ctx.getImageData(0, 0, w, h);
  const blurred = blurCtx.getImageData(0, 0, w, h);
  const mask = maskCtx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);

  for (let i = 0; i < original.data.length; i += 4) {
    const maskAlpha = mask.data[i] / 255;
    out.data[i] = original.data[i] * maskAlpha + blurred.data[i] * (1 - maskAlpha);
    out.data[i + 1] = original.data[i + 1] * maskAlpha + blurred.data[i + 1] * (1 - maskAlpha);
    out.data[i + 2] = original.data[i + 2] * maskAlpha + blurred.data[i + 2] * (1 - maskAlpha);
    out.data[i + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
}

export function applyBackgroundRemove(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  lm: Landmarks,
  intensity: number,
) {
  const w = canvas.width;
  const h = canvas.height;
  const jaw = lm.slice(0, 17);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d")!;
  maskCtx.fillStyle = "white";
  maskCtx.beginPath();
  maskCtx.moveTo(jaw[0].x, jaw[0].y);
  for (let i = 1; i < jaw.length; i++) maskCtx.lineTo(jaw[i].x, jaw[i].y);
  maskCtx.closePath();
  maskCtx.fill();

  const id = ctx.getImageData(0, 0, w, h);
  const mask = maskCtx.getImageData(0, 0, w, h);
  for (let i = 0; i < id.data.length; i += 4) {
    const a = mask.data[i] / 255;
    id.data[i + 3] = Math.round(id.data[i + 3] * a * (1 - intensity) + id.data[i + 3] * a);
  }
  ctx.putImageData(id, 0, 0);
}

export function applyBackgroundSolid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  lm: Landmarks,
  intensity: number,
  color: string,
) {
  const w = canvas.width;
  const h = canvas.height;
  const jaw = lm.slice(0, 17);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d")!;
  maskCtx.fillStyle = "white";
  maskCtx.beginPath();
  maskCtx.moveTo(jaw[0].x, jaw[0].y);
  for (let i = 1; i < jaw.length; i++) maskCtx.lineTo(jaw[i].x, jaw[i].y);
  maskCtx.closePath();
  maskCtx.fill();

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = w;
  bgCanvas.height = h;
  const bgCtx = bgCanvas.getContext("2d")!;
  bgCtx.fillStyle = color;
  bgCtx.fillRect(0, 0, w, h);

  const original = ctx.getImageData(0, 0, w, h);
  const bg = bgCtx.getImageData(0, 0, w, h);
  const mask = maskCtx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);

  for (let i = 0; i < original.data.length; i += 4) {
    const a = (mask.data[i] / 255) * intensity;
    out.data[i] = original.data[i] * (1 - a) + r * a;
    out.data[i + 1] = original.data[i + 1] * (1 - a) + g * a;
    out.data[i + 2] = original.data[i + 2] * (1 - a) + b * a;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

export function applyBackgroundGradient(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  lm: Landmarks,
  intensity: number,
  c1: string,
  c2: string,
) {
  const w = canvas.width;
  const h = canvas.height;
  const jaw = lm.slice(0, 17);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d")!;
  maskCtx.fillStyle = "white";
  maskCtx.beginPath();
  maskCtx.moveTo(jaw[0].x, jaw[0].y);
  for (let i = 1; i < jaw.length; i++) maskCtx.lineTo(jaw[i].x, jaw[i].y);
  maskCtx.closePath();
  maskCtx.fill();

  const gradCanvas = document.createElement("canvas");
  gradCanvas.width = w;
  gradCanvas.height = h;
  const gradCtx = gradCanvas.getContext("2d")!;
  const grad = gradCtx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  gradCtx.fillStyle = grad;
  gradCtx.fillRect(0, 0, w, h);

  const original = ctx.getImageData(0, 0, w, h);
  const bg = gradCtx.getImageData(0, 0, w, h);
  const mask = maskCtx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);

  for (let i = 0; i < original.data.length; i += 4) {
    const a = (mask.data[i] / 255) * intensity;
    out.data[i] = original.data[i] * (1 - a) + bg.data[i] * a;
    out.data[i + 1] = original.data[i + 1] * (1 - a) + bg.data[i + 1] * a;
    out.data[i + 2] = original.data[i + 2] * (1 - a) + bg.data[i + 2] * a;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

// ── Makeup ──

export function applyMakeup(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lm: Landmarks,
  s: BeautySettings,
  lipCol: string,
  blushCol: string,
  shadowCol: string,
) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const mouth = lm.slice(48, 68);
  const lEye = lm.slice(36, 42);
  const rEye = lm.slice(42, 48);
  const jaw = lm.slice(0, 17);

  // Lipstick
  if (s.lipstick > 0) {
    const lr = parseInt(lipCol.slice(1, 3), 16);
    const lg = parseInt(lipCol.slice(3, 5), 16);
    const lb = parseInt(lipCol.slice(5, 7), 16);
    const lipCY = mouth.reduce((a, p) => a + p.y, 0) / mouth.length;
    const lipL = Math.min(...mouth.map((p) => p.x));
    const lipR = Math.max(...mouth.map((p) => p.x));
    const st = s.lipstick / 100;
    for (let y = Math.max(0, lipCY - 18); y < Math.min(h, lipCY + 18); y++) {
      for (let x = lipL - 2; x < lipR + 2; x++) {
        if (x < 0 || x >= w) continue;
        const idx = (y * w + x) * 4;
        const distY = Math.abs(y - lipCY) / 18;
        const alpha = st * 0.6 * (1 - distY);
        d[idx] = d[idx] * (1 - alpha) + lr * alpha;
        d[idx + 1] = d[idx + 1] * (1 - alpha) + lg * alpha;
        d[idx + 2] = d[idx + 2] * (1 - alpha) + lb * alpha;
      }
    }
  }

  // Blush
  if (s.blush > 0) {
    const br = parseInt(blushCol.slice(1, 3), 16);
    const bg2 = parseInt(blushCol.slice(3, 5), 16);
    const bb = parseInt(blushCol.slice(5, 7), 16);
    const lCheekX = (lEye[0].x + jaw[0].x) / 2;
    const rCheekX = (rEye[3].x + jaw[16].x) / 2;
    const cheekY = (lEye[0].y + jaw[8].y) / 2;
    const st = s.blush / 100;
    for (const cx of [lCheekX, rCheekX]) {
      for (let y = cheekY - 30; y < cheekY + 30; y++) {
        for (let x = cx - 30; x < cx + 30; x++) {
          if (x < 0 || x >= w || y < 0 || y >= h) continue;
          const dx = x - cx;
          const dy = y - cheekY;
          const dist = Math.sqrt(dx * dx + dy * dy) / 30;
          if (dist > 1) continue;
          const idx = (y * w + x) * 4;
          const alpha = st * 0.35 * (1 - dist);
          d[idx] = d[idx] * (1 - alpha) + br * alpha;
          d[idx + 1] = d[idx + 1] * (1 - alpha) + bg2 * alpha;
          d[idx + 2] = d[idx + 2] * (1 - alpha) + bb * alpha;
        }
      }
    }
  }

  // Eyeshadow
  if (s.eyeshadow > 0) {
    const sr = parseInt(shadowCol.slice(1, 3), 16);
    const sg = parseInt(shadowCol.slice(3, 5), 16);
    const sb = parseInt(shadowCol.slice(5, 7), 16);
    const lBrow = lm.slice(17, 22);
    const rBrow = lm.slice(22, 27);
    const st = s.eyeshadow / 100;
    for (const eye of [lEye, rEye]) {
      const eyeCX = eye.reduce((a, p) => a + p.x, 0) / 6;
      const eyeCY = eye.reduce((a, p) => a + p.y, 0) / 6;
      const brow = eye === lEye ? lBrow : rBrow;
      const browCY = Math.min(...brow.map((p) => p.y));
      for (let y = browCY; y < eyeCY + 5; y++) {
        for (let x = eyeCX - 35; x < eyeCX + 35; x++) {
          if (x < 0 || x >= w || y < 0 || y >= h) continue;
          const dy = (eyeCY - y) / (eyeCY - browCY);
          const dx = Math.abs(x - eyeCX) / 35;
          if (dy < 0 || dy > 1.2 || dx > 1) continue;
          const idx = (y * w + x) * 4;
          const alpha = st * 0.3 * Math.max(0, 1 - dx) * Math.min(1, dy);
          d[idx] = d[idx] * (1 - alpha) + sr * alpha;
          d[idx + 1] = d[idx + 1] * (1 - alpha) + sg * alpha;
          d[idx + 2] = d[idx + 2] * (1 - alpha) + sb * alpha;
        }
      }
    }
  }

  // Eyeliner
  if (s.eyeliner > 0) {
    const st = s.eyeliner / 100;
    for (const eye of [lEye, rEye]) {
      for (let i = 0; i < eye.length; i++) {
        const p1 = eye[i];
        const p2 = eye[(i + 1) % eye.length];
        const steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
        for (let t = 0; t <= steps; t++) {
          const x = Math.round(p1.x + ((p2.x - p1.x) * t) / steps);
          const y = Math.round(p1.y + ((p2.y - p1.y) * t) / steps);
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const px = x + dx;
              const py = y + dy;
              if (px < 0 || px >= w || py < 0 || py >= h) continue;
              const idx = (py * w + px) * 4;
              const dist = Math.sqrt(dx * dx + dy * dy) / 2;
              const alpha = st * 0.7 * Math.max(0, 1 - dist);
              d[idx] = d[idx] * (1 - alpha);
              d[idx + 1] = d[idx + 1] * (1 - alpha);
              d[idx + 2] = d[idx + 2] * (1 - alpha);
            }
          }
        }
      }
    }
  }

  ctx.putImageData(id, 0, 0);
}

// ── Local Adjustment Brush ──

export function applyLocalAdjustment(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mask: ImageData,
  s: BeautySettings,
) {
  if (!mask) return;
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const md = mask.data;
  const bright = (s.local_bright / 100) * 60;
  const warm = (s.local_warm / 100) * 30;
  const sat = s.local_sat / 100;
  for (let i = 0; i < d.length; i += 4) {
    const alpha = md[i + 3] / 255;
    if (alpha < 0.01) continue;
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    r += bright * alpha;
    g += bright * alpha;
    b += bright * alpha;
    r += warm * alpha;
    b -= warm * alpha;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (1 + sat * alpha) * (r - gray);
    g = gray + (1 + sat * alpha) * (g - gray);
    b = gray + (1 + sat * alpha) * (b - gray);
    d[i] = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(id, 0, 0);
}

// ── Color Splash ──

export function applyColorSplash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  targetHue: number,
  range: number,
  intensity: number,
) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const halfRange = range / 2;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h2 = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d2 = max - min;
      if (max === r) h2 = ((g - b) / d2 + (g < b ? 6 : 0)) / 6;
      else if (max === g) h2 = ((b - r) / d2 + 2) / 6;
      else h2 = ((r - g) / d2 + 4) / 6;
    }
    const hueDeg = h2 * 360;
    let dist = Math.abs(hueDeg - targetHue);
    if (dist > 180) dist = 360 - dist;
    if (dist > halfRange) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const a = intensity;
      d[i] = d[i] * (1 - a) + gray * a;
      d[i + 1] = d[i + 1] * (1 - a) + gray * a;
      d[i + 2] = d[i + 2] * (1 - a) + gray * a;
    }
  }
  ctx.putImageData(id, 0, 0);
}

// ── Double Exposure ──

export function applyDoubleExposure(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img2: HTMLImageElement,
  mode: string,
  intensity: number,
  opacity: number,
) {
  const w = canvas.width;
  const h = canvas.height;
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = w;
  tmpCanvas.height = h;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.drawImage(img2, 0, 0, w, h);
  const bg = tmpCtx.getImageData(0, 0, w, h);
  const fg = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < fg.data.length; i += 4) {
    let r: number;
    let g: number;
    let b: number;
    const fr = fg.data[i] / 255;
    const fb = fg.data[i + 1] / 255;
    const fc = fg.data[i + 2] / 255;
    const br = bg.data[i] / 255;
    const bb2 = bg.data[i + 1] / 255;
    const bc = bg.data[i + 2] / 255;
    if (mode === "screen") {
      r = 1 - (1 - fr) * (1 - br);
      g = 1 - (1 - fb) * (1 - bb2);
      b = 1 - (1 - fc) * (1 - bc);
    } else if (mode === "soft-light") {
      r = br < 0.5 ? 2 * fr * br + fr * fr * (1 - 2 * br) : Math.sqrt(fr) * (2 * br - 1) + 2 * fr * (1 - br);
      g = bb2 < 0.5 ? 2 * fb * bb2 + fb * fb * (1 - 2 * bb2) : Math.sqrt(fb) * (2 * bb2 - 1) + 2 * fb * (1 - bb2);
      b = bc < 0.5 ? 2 * fc * bc + fc * fc * (1 - 2 * bc) : Math.sqrt(fc) * (2 * bc - 1) + 2 * fc * (1 - bc);
    } else {
      // overlay
      r = fr < 0.5 ? 2 * fr * br : 1 - 2 * (1 - fr) * (1 - br);
      g = fb < 0.5 ? 2 * fb * bb2 : 1 - 2 * (1 - fb) * (1 - bb2);
      b = fc < 0.5 ? 2 * fc * bc : 1 - 2 * (1 - fc) * (1 - bc);
    }
    const a = intensity * opacity;
    out.data[i] = Math.max(0, Math.min(255, fg.data[i] * (1 - a) + r * 255 * a));
    out.data[i + 1] = Math.max(0, Math.min(255, fg.data[i + 1] * (1 - a) + g * 255 * a));
    out.data[i + 2] = Math.max(0, Math.min(255, fg.data[i + 2] * (1 - a) + b * 255 * a));
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}
