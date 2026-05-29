import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const MAX_HISTORY = 20;

type BeautyCategory = "beauty" | "reshape" | "color" | "filter";
type BeautyTool =
  | "smooth" | "slim" | "bigeye" | "whiten" | "sharpen"
  | "nose" | "lip" | "forehead" | "eyebag" | "darkcircle"
  | "blemish" | "facelift" | "jawline" | "faceWidth" | "eyeDistance" | "faceLength" | "cheekbone" | "chin" | "philtrum"
  | "temperature" | "saturation" | "contrast" | "brightness" | "vignette" | "grain";

interface BeautySettings {
  [key: string]: number;
  smooth: number; slim: number; bigeye: number; whiten: number; sharpen: number;
  nose: number; lip: number; forehead: number; eyebag: number; darkcircle: number;
  blemish: number; facelift: number; jawline: number;
  faceWidth: number; eyeDistance: number; faceLength: number; cheekbone: number; chin: number; philtrum: number;
  temperature: number; saturation: number; contrast: number; brightness: number; vignette: number; grain: number;
}

const INITIAL: BeautySettings = {
  smooth: 0, slim: 0, bigeye: 0, whiten: 0, sharpen: 0,
  nose: 0, lip: 0, forehead: 0, eyebag: 0, darkcircle: 0,
  blemish: 0, facelift: 0, jawline: 0,
  faceWidth: 0, eyeDistance: 0, faceLength: 0, cheekbone: 0, chin: 0, philtrum: 0,
  temperature: 0, saturation: 0, contrast: 0, brightness: 0, vignette: 0, grain: 0,
};

interface FilterPreset { name: string; icon: string; settings: Partial<BeautySettings>; }
const FILTERS: FilterPreset[] = [
  { name: "editor.filter.natural", icon: "🌿", settings: { smooth: 50, whiten: 20 } },
  { name: "editor.filter.beauty", icon: "💄", settings: { smooth: 70, slim: 25, bigeye: 15, whiten: 35 } },
  { name: "editor.filter.portrait", icon: "📸", settings: { smooth: 35, sharpen: 20, contrast: 10 } },
  { name: "editor.filter.vintage", icon: "🎞", settings: { smooth: 40, temperature: -25, saturation: -10, vignette: 30 } },
  { name: "editor.filter.film", icon: "🎬", settings: { smooth: 30, temperature: -15, saturation: -20, grain: 25, contrast: 15 } },
  { name: "editor.filter.japanese", icon: "🇯🇵", settings: { smooth: 45, whiten: 25, temperature: 10, saturation: -15, brightness: 10 } },
  { name: "editor.filter.hongkong", icon: "🇭🇰", settings: { smooth: 35, contrast: 20, saturation: 15, temperature: -10 } },
  { name: "editor.filter bw", icon: "⬛", settings: { saturation: -100, contrast: 25 } },
  { name: "editor.filter.cool", icon: "❄", settings: { temperature: -30, saturation: -10, brightness: 5 } },
  { name: "editor.filter.warm", icon: "☀", settings: { temperature: 25, saturation: 10, brightness: 5 } },
  { name: "editor.filter.hicontrast", icon: "🌗", settings: { contrast: 35, saturation: 10, sharpen: 15 } },
  { name: "editor.filter.dreamy", icon: "🌙", settings: { smooth: 60, whiten: 30, brightness: 15, vignette: 20, grain: 10 } },
];

const CATEGORIES: { key: BeautyCategory; icon: string; labelKey: string }[] = [
  { key: "beauty", icon: "✨", labelKey: "editor.cat.beauty" },
  { key: "reshape", icon: "💎", labelKey: "editor.cat.reshape" },
  { key: "color", icon: "🎨", labelKey: "editor.cat.color" },
  { key: "filter", icon: "📷", labelKey: "editor.cat.filter" },
];

const TOOLS: Record<BeautyCategory, { key: BeautyTool; icon: string; labelKey: string }[]> = {
  beauty: [
    { key: "smooth", icon: "✨", labelKey: "editor.smooth" },
    { key: "whiten", icon: "☀", labelKey: "editor.whiten" },
    { key: "sharpen", icon: "🔍", labelKey: "editor.sharpen" },
    { key: "forehead", icon: "🧴", labelKey: "editor.forehead" },
    { key: "eyebag", icon: "👁", labelKey: "editor.eyebag" },
    { key: "darkcircle", icon: "💫", labelKey: "editor.darkcircle" },
    { key: "blemish", icon: "🩹", labelKey: "editor.blemish" },
  ],
  reshape: [
    { key: "slim", icon: "💎", labelKey: "editor.slim" },
    { key: "bigeye", icon: "👁", labelKey: "editor.bigeye" },
    { key: "nose", icon: "👃", labelKey: "editor.nose" },
    { key: "lip", icon: "💋", labelKey: "editor.lip" },
    { key: "facelift", icon: "⬆", labelKey: "editor.facelift" },
    { key: "jawline", icon: "📐", labelKey: "editor.jawline" },
    { key: "faceWidth", icon: "↔", labelKey: "editor.faceWidth" },
    { key: "eyeDistance", icon: "👁‍🗨", labelKey: "editor.eyeDistance" },
    { key: "faceLength", icon: "↕", labelKey: "editor.faceLength" },
    { key: "cheekbone", icon: "🦴", labelKey: "editor.cheekbone" },
    { key: "chin", icon: "🔻", labelKey: "editor.chin" },
    { key: "philtrum", icon: "📍", labelKey: "editor.philtrum" },
  ],
  color: [
    { key: "temperature", icon: "🌡", labelKey: "editor.temperature" },
    { key: "saturation", icon: "🎭", labelKey: "editor.saturation" },
    { key: "contrast", icon: "🌗", labelKey: "editor.contrast" },
    { key: "brightness", icon: "☀", labelKey: "editor.brightness" },
  ],
  filter: [],
};

type Landmarks = { x: number; y: number }[];

export default function PhotoEditorPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement | null>(null);
  const landmarksRef = useRef<Landmarks | null>(null);
  const historyRef = useRef<BeautySettings[]>([INITIAL]);
  const historyIdxRef = useRef(0);
  const rafRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [cat, setCat] = useState<BeautyCategory>("beauty");
  const [tool, setTool] = useState<BeautyTool>("smooth");
  const [settings, setSettings] = useState<BeautySettings>({ ...INITIAL });
  const [faceOk, setFaceOk] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [exportQuality, setExportQuality] = useState(90);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [compareDrag, setCompareDrag] = useState(false);

  // Load models
  useEffect(() => {
    let m = true;
    import("face-api.js").then(async api => {
      try {
        await Promise.all([
          api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        if (m) setModelsReady(true);
      } catch (e) { console.error("Model load failed:", e); }
    });
    return () => { m = false; };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [historyIdx]);

  const pushHistory = useCallback((s: BeautySettings) => {
    const idx = historyIdxRef.current;
    const next = historyRef.current.slice(0, idx + 1);
    next.push({ ...s });
    if (next.length > MAX_HISTORY) next.shift();
    historyRef.current = next;
    historyIdxRef.current = next.length - 1;
    setHistoryIdx(next.length - 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    setHistoryIdx(historyIdxRef.current);
    setSettings({ ...historyRef.current[historyIdxRef.current] });
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    setHistoryIdx(historyIdxRef.current);
    setSettings({ ...historyRef.current[historyIdxRef.current] });
  }, []);

  // Core rendering
  const render = useCallback((s: BeautySettings) => {
    const canvas = canvasRef.current;
    const img = originalRef.current;
    const lm = landmarksRef.current;
    if (!canvas || !img || !lm) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = id.data;
      const w = canvas.width, h = canvas.height;

      const jaw = lm.slice(0, 17), lEye = lm.slice(36, 42), rEye = lm.slice(42, 48);
      const nose = lm.slice(27, 36), mouth = lm.slice(48, 68);
      const lBrow = lm.slice(17, 22), rBrow = lm.slice(22, 27);

      const fL = Math.min(...lm.map(p => p.x)), fR = Math.max(...lm.map(p => p.x));
      const fT = Math.min(...lm.map(p => p.y)), fB = Math.max(...lm.map(p => p.y));
      const fCX = (fL + fR) / 2, fCY = (fT + fB) / 2;

      // Skin smoothing (bilateral filter approx)
      if (s.smooth > 0) {
        const r = Math.floor(s.smooth / 8) + 1;
        const out = new Uint8ClampedArray(d);
        for (let y = fT; y < fB; y++) {
          for (let x = fL; x < fR; x++) {
            if (!isSkin(x, y, lEye, rEye, mouth, jaw)) continue;
            const idx = (y * w + x) * 4;
            let sr = 0, sg = 0, sb = 0, c = 0;
            const cr = d[idx], cg = d[idx + 1], cb = d[idx + 2];
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const ni = (ny * w + nx) * 4;
                const diff = Math.abs(d[ni] - cr) + Math.abs(d[ni + 1] - cg) + Math.abs(d[ni + 2] - cb);
                if (diff > 80) continue; // Edge-preserving
                sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; c++;
              }
            }
            if (c > 0) { out[idx] = sr / c; out[idx + 1] = sg / c; out[idx + 2] = sb / c; }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = out[i];
      }

      // Face slim
      if (s.slim > 0) {
        const st = s.slim / 100 * 0.15;
        const tmp = new Uint8ClampedArray(d);
        for (let y = fT; y < fB; y++) {
          for (let x = fL; x < fR; x++) {
            const dist = (x - fCX) / ((fR - fL) / 2);
            const warp = 1 - st * dist * dist;
            const sx = Math.round(fCX + (x - fCX) * warp);
            if (sx >= 0 && sx < w) {
              const di = (y * w + x) * 4, si = (y * w + sx) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Face width
      if (s.faceWidth !== 0) {
        const st = s.faceWidth / 100 * 0.2;
        const tmp = new Uint8ClampedArray(d);
        for (let y = fT; y < fB; y++) {
          for (let x = fL; x < fR; x++) {
            const dist = (x - fCX) / ((fR - fL) / 2);
            const warp = 1 + st * (1 - dist * dist);
            const sx = Math.round(fCX + (x - fCX) / warp);
            if (sx >= 0 && sx < w) {
              const di = (y * w + x) * 4, si = (y * w + sx) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Face length
      if (s.faceLength !== 0) {
        const st = s.faceLength / 100 * 0.15;
        const tmp = new Uint8ClampedArray(d);
        for (let y = fT; y < fB; y++) {
          for (let x = fL; x < fR; x++) {
            const dist = (y - fCY) / ((fB - fT) / 2);
            const warp = 1 + st * (1 - dist * dist);
            const sy = Math.round(fCY + (y - fCY) / warp);
            if (sy >= 0 && sy < h) {
              const di = (y * w + x) * 4, si = (sy * w + x) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Eye enlargement
      if (s.bigeye > 0) {
        const eyes = [...lEye, ...rEye];
        const eCX = eyes.reduce((a, p) => a + p.x, 0) / eyes.length;
        const eCY = eyes.reduce((a, p) => a + p.y, 0) / eyes.length;
        const eR = Math.max(Math.max(...lEye.map(p => p.x)) - Math.min(...lEye.map(p => p.x)), Math.max(...rEye.map(p => p.x)) - Math.min(...rEye.map(p => p.x))) / 2;
        const st = s.bigeye / 100 * 0.3;
        const tmp = new Uint8ClampedArray(d);
        for (let y = Math.max(0, eCY - eR * 2); y < Math.min(h, eCY + eR * 2); y++) {
          for (let x = Math.max(0, eCX - eR * 2); x < Math.min(w, eCX + eR * 2); x++) {
            const dx = x - eCX, dy = y - eCY, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < eR * 1.5) {
              const f = 1 + st * Math.max(0, 1 - dist / (eR * 1.5));
              const sx = Math.round(eCX + dx / f), sy = Math.round(eCY + dy / f);
              if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                const di = (y * w + x) * 4, si = (sy * w + sx) * 4;
                tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
              }
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Eye distance
      if (s.eyeDistance !== 0) {
        const st = s.eyeDistance / 100 * 0.15;
        const eMidX = (lEye.reduce((a, p) => a + p.x, 0) / 6 + rEye.reduce((a, p) => a + p.x, 0) / 6) / 2;
        const tmp = new Uint8ClampedArray(d);
        for (let y = fT; y < fB; y++) {
          for (let x = fL; x < fR; x++) {
            const dist = (x - eMidX) / ((fR - fL) / 2);
            const warp = 1 + st * Math.exp(-dist * dist * 4);
            const sx = Math.round(eMidX + (x - eMidX) / warp);
            if (sx >= 0 && sx < w) {
              const di = (y * w + x) * 4, si = (y * w + sx) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Nose slimming
      if (s.nose > 0) {
        const nCX = nose.reduce((a, p) => a + p.x, 0) / nose.length;
        const nCY = nose.reduce((a, p) => a + p.y, 0) / nose.length;
        const nR = 30, st = s.nose / 100 * 0.2;
        const tmp = new Uint8ClampedArray(d);
        for (let y = Math.max(0, nCY - nR); y < Math.min(h, nCY + nR); y++) {
          for (let x = Math.max(0, nCX - nR); x < Math.min(w, nCX + nR); x++) {
            const dx = x - nCX, dy = y - nCY, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nR) {
              const f = 1 + st * Math.max(0, 1 - dist / nR);
              const sx = Math.round(nCX + dx / f);
              if (sx >= 0 && sx < w) {
                const di = (y * w + x) * 4, si = (y * w + sx) * 4;
                tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
              }
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Lip enhancement
      if (s.lip > 0) {
        const lipCY = mouth.reduce((a, p) => a + p.y, 0) / mouth.length;
        const lipL = Math.min(...mouth.map(p => p.x)), lipR = Math.max(...mouth.map(p => p.x));
        const st = s.lip / 100 * 30;
        for (let y = Math.max(0, lipCY - 15); y < Math.min(h, lipCY + 15); y++) {
          for (let x = lipL; x < lipR; x++) {
            const idx = (y * w + x) * 4;
            d[idx] = Math.min(255, d[idx] + st * 1.2);
            d[idx + 1] = Math.max(0, d[idx + 1] - st * 0.3);
            d[idx + 2] = Math.max(0, d[idx + 2] - st * 0.2);
          }
        }
      }

      // Forehead smoothing
      if (s.forehead > 0) {
        const bCY = Math.min(...lBrow.map(p => p.y), ...rBrow.map(p => p.y));
        const r = Math.floor(s.forehead / 8) + 1;
        for (let y = Math.max(0, bCY - 40); y < bCY; y++) {
          for (let x = fL; x < fR; x++) {
            const idx = (y * w + x) * 4;
            let sr = 0, sg = 0, sb = 0, c = 0;
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  const ni = (ny * w + nx) * 4;
                  sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; c++;
                }
              }
            }
            if (c > 0) { d[idx] = sr / c; d[idx + 1] = sg / c; d[idx + 2] = sb / c; }
          }
        }
      }

      // Eye bag removal
      if (s.eyebag > 0) {
        const lEY = lEye.reduce((a, p) => a + p.y, 0) / 6 + 10;
        const rEY = rEye.reduce((a, p) => a + p.y, 0) / 6 + 10;
        const r = Math.floor(s.eyebag / 8) + 1;
        for (const ey of [lEY, rEY]) {
          for (let y = ey - 12; y < ey + 12; y++) {
            for (let x = fL; x < fR; x++) {
              if (y < 0 || y >= h) continue;
              const idx = (y * w + x) * 4;
              let sr = 0, sg = 0, sb = 0, c = 0;
              for (let dy = -r; dy <= r; dy++) {
                const ny = y + dy;
                if (ny >= 0 && ny < h) {
                  const ni = (ny * w + x) * 4;
                  sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; c++;
                }
              }
              if (c > 0) { d[idx] = sr / c; d[idx + 1] = sg / c; d[idx + 2] = sb / c; }
            }
          }
        }
      }

      // Dark circle removal
      if (s.darkcircle > 0) {
        const lEY = lEye.reduce((a, p) => a + p.y, 0) / 6;
        const rEY = rEye.reduce((a, p) => a + p.y, 0) / 6;
        const st = s.darkcircle / 100 * 25;
        for (const ey of [lEY, rEY]) {
          for (let y = ey; y < ey + 15; y++) {
            for (let x = fL; x < fR; x++) {
              if (y >= 0 && y < h) {
                const idx = (y * w + x) * 4;
                d[idx] = Math.min(255, d[idx] + st);
                d[idx + 1] = Math.min(255, d[idx + 1] + st * 0.8);
                d[idx + 2] = Math.min(255, d[idx + 2] + st * 0.6);
              }
            }
          }
        }
      }

      // Whitening
      if (s.whiten > 0) {
        const st = s.whiten / 100 * 40;
        for (let y = fT; y < fB; y++) {
          for (let x = fL; x < fR; x++) {
            if (!isSkin(x, y, lEye, rEye, mouth, jaw)) continue;
            const idx = (y * w + x) * 4;
            d[idx] = Math.min(255, d[idx] + st);
            d[idx + 1] = Math.min(255, d[idx + 1] + st);
            d[idx + 2] = Math.min(255, d[idx + 2] + st * 0.8);
          }
        }
      }

      // Face lift
      if (s.facelift > 0) {
        const st = s.facelift / 100 * 0.1;
        const tmp = new Uint8ClampedArray(d);
        for (let y = fT; y < fB; y++) {
          const ratio = (y - fT) / (fB - fT);
          const warp = 1 - st * ratio * ratio;
          for (let x = fL; x < fR; x++) {
            const sy = Math.round(fCY + (y - fCY) * warp);
            if (sy >= 0 && sy < h) {
              const di = (y * w + x) * 4, si = (sy * w + x) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Jawline
      if (s.jawline > 0) {
        const st = s.jawline / 100 * 0.12;
        const tmp = new Uint8ClampedArray(d);
        for (let y = fT; y < fB; y++) {
          for (let x = fL; x < fR; x++) {
            const dist = Math.abs(x - fCX) / ((fR - fL) / 2);
            if (dist > 0.6) {
              const warp = 1 - st * (dist - 0.6);
              const sx = Math.round(fCX + (x - fCX) * warp);
              if (sx >= 0 && sx < w) {
                const di = (y * w + x) * 4, si = (y * w + sx) * 4;
                tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
              }
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Cheekbone
      if (s.cheekbone !== 0) {
        const st = s.cheekbone / 100 * 0.1;
        const lCheekX = (lEye[0].x + jaw[0].x) / 2;
        const rCheekX = (rEye[3].x + jaw[16].x) / 2;
        const cheekY = (lEye[0].y + jaw[8].y) / 2;
        const tmp = new Uint8ClampedArray(d);
        for (const cx of [lCheekX, rCheekX]) {
          const r = 25;
          for (let y = cheekY - r; y < cheekY + r; y++) {
            for (let x = cx - r; x < cx + r; x++) {
              if (x < 0 || x >= w || y < 0 || y >= h) continue;
              const dx = x - cx, dy = y - cheekY, dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < r) {
                const f = 1 + st * Math.max(0, 1 - dist / r);
                const sx = Math.round(cx + dx / f);
                if (sx >= 0 && sx < w) {
                  const di = (y * w + x) * 4, si = (y * w + sx) * 4;
                  tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
                }
              }
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Chin
      if (s.chin !== 0) {
        const chinY = jaw[8].y;
        const st = s.chin / 100 * 0.15;
        const tmp = new Uint8ClampedArray(d);
        const r = 20;
        for (let y = chinY - r; y < chinY + r; y++) {
          for (let x = fL; x < fR; x++) {
            if (y < 0 || y >= h || x < 0 || x >= w) continue;
            const dy = y - chinY;
            const f = 1 + st * Math.max(0, 1 - Math.abs(dy) / r);
            const sy = Math.round(chinY + dy / f);
            if (sy >= 0 && sy < h) {
              const di = (y * w + x) * 4, si = (sy * w + x) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Philtrum
      if (s.philtrum !== 0) {
        const pTop = nose[6].y;
        const pBot = mouth[0].y;
        const pCY = (pTop + pBot) / 2;
        const st = s.philtrum / 100 * 0.12;
        const tmp = new Uint8ClampedArray(d);
        for (let y = pTop; y < pBot; y++) {
          for (let x = fL; x < fR; x++) {
            const dy = y - pCY;
            const f = 1 + st * Math.max(0, 1 - Math.abs(dy) / ((pBot - pTop) / 2));
            const sy = Math.round(pCY + dy / f);
            if (sy >= 0 && sy < h) {
              const di = (y * w + x) * 4, si = (sy * w + x) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }

      // Color adjustments
      if (s.temperature !== 0 || s.saturation !== 0 || s.contrast !== 0 || s.brightness !== 0) {
        const temp = s.temperature / 100 * 30;
        const sat = s.saturation / 100;
        const con = s.contrast / 100;
        const bri = s.brightness / 100 * 50;
        for (let i = 0; i < d.length; i += 4) {
          let r = d[i], g = d[i + 1], b = d[i + 2];
          r = Math.min(255, r + temp); b = Math.max(0, b - temp);
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (1 + sat) * (r - gray); g = gray + (1 + sat) * (g - gray); b = gray + (1 + sat) * (b - gray);
          r = ((r / 255 - 0.5) * (1 + con) + 0.5) * 255;
          g = ((g / 255 - 0.5) * (1 + con) + 0.5) * 255;
          b = ((b / 255 - 0.5) * (1 + con) + 0.5) * 255;
          r += bri; g += bri; b += bri;
          d[i] = Math.max(0, Math.min(255, r));
          d[i + 1] = Math.max(0, Math.min(255, g));
          d[i + 2] = Math.max(0, Math.min(255, b));
        }
      }

      ctx.putImageData(id, 0, 0);

      // Vignette
      if (s.vignette > 0) {
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${s.vignette / 100 * 0.6})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Grain
      if (s.grain > 0) {
        const gd = ctx.getImageData(0, 0, w, h);
        const intensity = s.grain / 100 * 40;
        for (let i = 0; i < gd.data.length; i += 4) {
          const n = (Math.random() - 0.5) * intensity;
          gd.data[i] += n; gd.data[i + 1] += n; gd.data[i + 2] += n;
        }
        ctx.putImageData(gd, 0, 0);
      }

      // Sharpen (unsharp mask)
      if (s.sharpen > 0) {
        const gd = ctx.getImageData(0, 0, w, h);
        const d2 = gd.data;
        const amount = s.sharpen / 100 * 1.5;
        const orig = new Uint8ClampedArray(d2);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = orig[idx + c] * 5;
              const neighbors = orig[((y - 1) * w + x) * 4 + c] + orig[((y + 1) * w + x) * 4 + c] +
                orig[(y * w + x - 1) * 4 + c] + orig[(y * w + x + 1) * 4 + c];
              const sharp = center - neighbors;
              d2[idx + c] = Math.max(0, Math.min(255, orig[idx + c] + sharp * amount));
            }
          }
        }
        ctx.putImageData(gd, 0, 0);
      }
    });
  }, []);

  const handleUpload = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLoading(true);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = async () => {
          originalRef.current = img;
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          setLoading(false);

          // Detect face once
          setDetecting(true);
          const api = await import("face-api.js");
          const det = await api.default
            .detectSingleFace(canvas, new api.default.TinyFaceDetectorOptions())
            .withFaceLandmarks();
          setDetecting(false);
          if (det) {
            setFaceOk(true);
            landmarksRef.current = det.landmarks.positions;
            historyRef.current = [{ ...INITIAL }];
            historyIdxRef.current = 0;
            setHistoryIdx(0);
            setSettings({ ...INITIAL });
          } else {
            setFaceOk(false);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }, []);

  const handleSlider = useCallback((value: number) => {
    setSettings(prev => {
      const next = { ...prev, [tool]: value };
      render(next);
      return next;
    });
  }, [tool, render]);

  const commitHistory = useCallback(() => {
    setSettings(prev => { pushHistory(prev); return prev; });
  }, [pushHistory]);

  const applyPreset = useCallback((preset: Partial<BeautySettings>) => {
    const next = { ...INITIAL, ...preset } as BeautySettings;
    setSettings(next);
    render(next);
    pushHistory(next);
  }, [render, pushHistory]);

  const handleAutoEnhance = useCallback(() => {
    const next = { ...INITIAL, smooth: 55, slim: 18, bigeye: 12, whiten: 25, nose: 10, lip: 15, sharpen: 10, contrast: 8 };
    setSettings(next);
    render(next);
    pushHistory(next);
  }, [render, pushHistory]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `beautified.${exportFormat}`;
    link.href = canvas.toDataURL(`image/${exportFormat}`, exportQuality / 100);
    link.click();
    setShowExport(false);
  }, [exportFormat, exportQuality]);

  const handleReset = useCallback(() => {
    setSettings({ ...INITIAL });
    render(INITIAL);
    pushHistory(INITIAL);
  }, [render, pushHistory]);

  // Compare mouse handlers
  const onCompareMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!compareDrag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setComparePos(Math.max(0, Math.min(100, pos)));
  }, [compareDrag]);

  const currentTools = TOOLS[cat];

  return (
    <PageTransition>
      <div className="editor-root" onMouseMove={onCompareMove} onMouseUp={() => setCompareDrag(false)} onTouchMove={onCompareMove} onTouchEnd={() => setCompareDrag(false)}>
        <header className="editor-header">
          <h1>{t("editor.title")}</h1>
          <p>{t("editor.subtitle")}</p>
          {!modelsReady && <p className="editor-loading-models">{t("editor.loadingModels")}</p>}
        </header>

        <div className="editor-toolbar">
          <button type="button" className="editor-btn editor-btn--primary" onClick={handleUpload}>{t("editor.upload")}</button>
          {originalRef.current && (
            <>
              <button type="button" className="editor-btn" disabled={historyIdx <= 0} onClick={undo}>↩ {t("editor.undo")}</button>
              <button type="button" className="editor-btn" disabled={historyIdx >= historyRef.current.length - 1} onClick={redo}>↪ {t("editor.redo")}</button>
              <button type="button" className="editor-btn" onClick={handleAutoEnhance}>⚡ {t("editor.auto")}</button>
              <button type="button" className="editor-btn" onClick={() => setShowCompare(!showCompare)}>⇔ {t("editor.compare")}</button>
              <button type="button" className="editor-btn" onClick={handleReset}>{t("editor.reset")}</button>
              <button type="button" className="editor-btn editor-btn--primary" onClick={() => setShowExport(true)}>↓ {t("editor.export")}</button>
            </>
          )}
          {detecting && <span className="editor-detecting">{t("editor.detecting")}</span>}
          {faceOk && <span className="editor-face-ok">✓ {t("editor.faceDetected")}</span>}
        </div>

        <div className="editor-workspace">
          <div className="editor-canvas-container">
            <canvas
              ref={canvasRef}
              className="editor-canvas"
              style={showCompare ? { clipPath: `inset(0 ${100 - comparePos}% 0 0)` } : undefined}
            />
            {showCompare && originalRef.current && (
              <>
                <img
                  src={originalRef.current.src}
                  alt=""
                  style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
                    clipPath: `inset(0 0 0 ${comparePos}%)`,
                  }}
                />
                <div
                  className="editor-compare-line"
                  style={{ left: `${comparePos}%` }}
                  onMouseDown={() => setCompareDrag(true)}
                  onTouchStart={() => setCompareDrag(true)}
                >
                  <span className="editor-compare-label editor-compare-label--before">{t("editor.before")}</span>
                  <span className="editor-compare-label editor-compare-label--after">{t("editor.after")}</span>
                </div>
              </>
            )}
            {loading && <div className="editor-overlay">{t("editor.loadingImage")}</div>}
          </div>

          {originalRef.current && (
            <div className="editor-beauty-panel">
              <div className="editor-categories">
                {CATEGORIES.map(c => (
                  <button key={c.key} type="button" className={`editor-cat-btn ${cat === c.key ? "active" : ""}`}
                    onClick={() => { setCat(c.key); if (TOOLS[c.key].length) setTool(TOOLS[c.key][0].key); }}>
                    <span>{c.icon}</span><span>{t(c.labelKey as any)}</span>
                  </button>
                ))}
              </div>

              {cat === "filter" ? (
                <div className="editor-filter-grid">
                  {FILTERS.map((f, i) => (
                    <button key={i} type="button" className="editor-filter-btn" onClick={() => applyPreset(f.settings)}>
                      <span className="editor-filter-icon">{f.icon}</span>
                      <span className="editor-filter-name">{t(f.name as any)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="editor-tools">
                    {currentTools.map(tl => (
                      <button key={tl.key} type="button" className={`editor-tool-btn ${tool === tl.key ? "active" : ""}`}
                        onClick={() => setTool(tl.key)}>
                        <span className="editor-tool-icon">{tl.icon}</span>
                        <span className="editor-tool-label">{t(tl.labelKey as any)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="editor-slider-group">
                    <label>
                      {currentTools.find(tl => tl.key === tool) && t(currentTools.find(tl => tl.key === tool)!.labelKey as any)}
                      <span className="editor-slider-value">{settings[tool]}%</span>
                    </label>
                    <input type="range" min="-100" max="100" value={settings[tool]}
                      onChange={e => handleSlider(Number(e.target.value))}
                      onMouseUp={commitHistory} onTouchEnd={commitHistory}
                      className="editor-slider" />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {showExport && (
          <div className="editor-modal-overlay" onClick={() => setShowExport(false)}>
            <div className="editor-modal" onClick={e => e.stopPropagation()}>
              <h3>{t("editor.exportTitle")}</h3>
              <div className="editor-export-options">
                <label>{t("editor.format")}
                  <select value={exportFormat} onChange={e => setExportFormat(e.target.value as "png" | "jpeg")}>
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                </label>
                <label>{t("editor.quality")}
                  <input type="range" min="10" max="100" value={exportQuality}
                    onChange={e => setExportQuality(Number(e.target.value))} />
                  <span>{exportQuality}%</span>
                </label>
              </div>
              <div className="editor-modal-actions">
                <button type="button" className="editor-btn" onClick={() => setShowExport(false)}>{t("editor.cancel")}</button>
                <button type="button" className="editor-btn editor-btn--primary" onClick={handleDownload}>{t("editor.download")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function isSkin(x: number, y: number, lEye: Landmarks, rEye: Landmarks, mouth: Landmarks, jaw: Landmarks): boolean {
  if (lEye.some(p => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (rEye.some(p => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (mouth.some(p => Math.hypot(p.x - x, p.y - y) < 12)) return false;
  const fL = Math.min(...jaw.map(p => p.x)), fR = Math.max(...jaw.map(p => p.x));
  const fT = Math.min(...jaw.map(p => p.y)) - 30, fB = Math.max(...jaw.map(p => p.y)) + 10;
  return x >= fL && x <= fR && y >= fT && y <= fB;
}
