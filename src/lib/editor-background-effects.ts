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
