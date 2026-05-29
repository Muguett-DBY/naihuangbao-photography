import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const MAX_HISTORY = 20;

type BeautyCategory = "beauty" | "reshape" | "color" | "filter" | "tools";
type BeautyTool =
  | "smooth" | "slim" | "bigeye" | "whiten" | "sharpen"
  | "nose" | "lip" | "forehead" | "eyebag" | "darkcircle"
  | "blemish" | "facelift" | "jawline" | "faceWidth" | "eyeDistance" | "faceLength" | "cheekbone" | "chin" | "philtrum"
  | "temperature" | "saturation" | "contrast" | "brightness" | "vignette" | "grain"
  | "teeth" | "blur_bg";

interface BeautySettings {
  [key: string]: number;
  smooth: number; slim: number; bigeye: number; whiten: number; sharpen: number;
  nose: number; lip: number; forehead: number; eyebag: number; darkcircle: number;
  blemish: number; facelift: number; jawline: number;
  faceWidth: number; eyeDistance: number; faceLength: number; cheekbone: number; chin: number; philtrum: number;
  temperature: number; saturation: number; contrast: number; brightness: number; vignette: number; grain: number;
  teeth: number; blur_bg: number;
}

const INITIAL: BeautySettings = {
  smooth: 0, slim: 0, bigeye: 0, whiten: 0, sharpen: 0,
  nose: 0, lip: 0, forehead: 0, eyebag: 0, darkcircle: 0,
  blemish: 0, facelift: 0, jawline: 0,
  faceWidth: 0, eyeDistance: 0, faceLength: 0, cheekbone: 0, chin: 0, philtrum: 0,
  temperature: 0, saturation: 0, contrast: 0, brightness: 0, vignette: 0, grain: 0,
  teeth: 0, blur_bg: 0,
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
  { name: "editor.filter.bw", icon: "⬛", settings: { saturation: -100, contrast: 25 } },
  { name: "editor.filter.cool", icon: "❄", settings: { temperature: -30, saturation: -10, brightness: 5 } },
  { name: "editor.filter.warm", icon: "☀", settings: { temperature: 25, saturation: 10, brightness: 5 } },
  { name: "editor.filter.hicontrast", icon: "🌗", settings: { contrast: 35, saturation: 10, sharpen: 15 } },
  { name: "editor.filter.dreamy", icon: "🌙", settings: { smooth: 60, whiten: 30, brightness: 15, vignette: 20, grain: 10 } },
];

const FRAMES = [
  { id: "none", labelKey: "editor.frame.none", padding: 0, bg: "transparent" },
  { id: "polaroid", labelKey: "editor.frame.polaroid", padding: 40, bg: "#f5f5f5", paddingBottom: 60 },
  { id: "film", labelKey: "editor.frame.film", padding: 16, bg: "#111" },
  { id: "white", labelKey: "editor.frame.white", padding: 20, bg: "#fff" },
  { id: "rounded", labelKey: "editor.frame.rounded", padding: 0, bg: "transparent", borderRadius: 24 },
  { id: "magazine", labelKey: "editor.frame.magazine", padding: 8, bg: "#fafafa" },
  { id: "golden", labelKey: "editor.frame.golden", padding: 0, bg: "#1a1a1a" },
];

const STICKERS = ["❤", "⭐", "🌟", "✨", "🌸", "🌺", "🦋", "🎀", "👑", "💫", "🌈", "🎵", "🔥", "💯", "🎉", "📸", "🎬", "🎞"];

const CATEGORIES: { key: BeautyCategory; icon: string; labelKey: string }[] = [
  { key: "beauty", icon: "✨", labelKey: "editor.cat.beauty" },
  { key: "reshape", icon: "💎", labelKey: "editor.cat.reshape" },
  { key: "color", icon: "🎨", labelKey: "editor.cat.color" },
  { key: "filter", icon: "📷", labelKey: "editor.cat.filter" },
  { key: "tools", icon: "🛠", labelKey: "editor.cat.tools" },
];

const TOOLS: Record<BeautyCategory, { key: BeautyTool; icon: string; labelKey: string }[]> = {
  beauty: [
    { key: "smooth", icon: "✨", labelKey: "editor.smooth" },
    { key: "whiten", icon: "☀", labelKey: "editor.whiten" },
    { key: "sharpen", icon: "🔍", labelKey: "editor.sharpen" },
    { key: "teeth", icon: "🦷", labelKey: "editor.teeth" },
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
    { key: "vignette", icon: "🌑", labelKey: "editor.vignette" },
    { key: "grain", icon: "🎞", labelKey: "editor.grain" },
  ],
  filter: [],
  tools: [
    { key: "blur_bg", icon: "🌫", labelKey: "editor.blur_bg" },
  ],
};

type Landmarks = { x: number; y: number }[];

interface TextOverlay { id: string; text: string; x: number; y: number; size: number; color: string; }
interface StickerOverlay { id: string; emoji: string; x: number; y: number; size: number; }

export default function PhotoEditorPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement | null>(null);
  const landmarksRef = useRef<Landmarks | null>(null);
  const historyRef = useRef<BeautySettings[]>([{ ...INITIAL }]);
  const historyIdxRef = useRef(0);
  const rafRef = useRef(0);
  const blemishCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceApiRef = useRef<any>(null);

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
  const [showMesh, setShowMesh] = useState(false);

  // New feature states
  const [frameId, setFrameId] = useState("none");
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [showFramePanel, setShowFramePanel] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTextColor, setNewTextColor] = useState("#ffffff");
  const [blemishMode, setBlemishMode] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Load models
  useEffect(() => {
    let m = true;
    import("face-api.js").then(async api => {
      faceApiRef.current = api;
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
    if (!canvas || !img) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw original
      ctx.drawImage(img, 0, 0);

      // Apply face effects if landmarks available
      if (lm) {
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = id.data;
        const w = canvas.width, h = canvas.height;
        const jaw = lm.slice(0, 17), lEye = lm.slice(36, 42), rEye = lm.slice(42, 48);
        const nose = lm.slice(27, 36), mouth = lm.slice(48, 68);
        const lBrow = lm.slice(17, 22), rBrow = lm.slice(22, 27);
        const fL = Math.min(...lm.map(p => p.x)), fR = Math.max(...lm.map(p => p.x));
        const fT = Math.min(...lm.map(p => p.y)), fB = Math.max(...lm.map(p => p.y));
        const fCX = (fL + fR) / 2, fCY = (fT + fB) / 2;

        // 1. Skin smoothing
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
                  if (Math.abs(d[ni] - cr) + Math.abs(d[ni + 1] - cg) + Math.abs(d[ni + 2] - cb) > 80) continue;
                  sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; c++;
                }
              }
              if (c > 0) { out[idx] = sr / c; out[idx + 1] = sg / c; out[idx + 2] = sb / c; }
            }
          }
          for (let i = 0; i < d.length; i++) d[i] = out[i];
        }

        // 2. Face slim
        if (s.slim > 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, s.slim / 100 * 0.15, "horizontal"); }
        if (s.faceWidth !== 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, -s.faceWidth / 100 * 0.2, "horizontal"); }
        if (s.faceLength !== 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, s.faceLength / 100 * 0.15, "vertical"); }

        // 3. Eye enlargement
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

        // 4. Eye distance
        if (s.eyeDistance !== 0) {
          const eMidX = (lEye.reduce((a, p) => a + p.x, 0) / 6 + rEye.reduce((a, p) => a + p.x, 0) / 6) / 2;
          const st = s.eyeDistance / 100 * 0.15;
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

        // 5. Nose slimming
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

        // 6. Lip enhancement
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

        // 7. Teeth whitening
        if (s.teeth > 0) {
          const mouthTop = Math.min(...mouth.map(p => p.y));
          const mouthBot = Math.max(...mouth.map(p => p.y));
          const mouthL = Math.min(...mouth.map(p => p.x));
          const mouthR = Math.max(...mouth.map(p => p.x));
          const teethCY = (mouthTop + mouthBot) / 2;
          const st = s.teeth / 100 * 50;
          for (let y = teethCY; y < mouthBot; y++) {
            for (let x = mouthL + 5; x < mouthR - 5; x++) {
              if (x < 0 || x >= w || y < 0 || y >= h) continue;
              const idx = (y * w + x) * 4;
              const r = d[idx], g = d[idx + 1], b = d[idx + 2];
              const brightness = (r + g + b) / 3;
              if (brightness > 100) {
                d[idx] = Math.min(255, r + st);
                d[idx + 1] = Math.min(255, g + st * 0.9);
                d[idx + 2] = Math.min(255, b + st * 0.8);
              }
            }
          }
        }

        // 8. Forehead smoothing
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

        // 9. Eye bag removal
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

        // 10. Dark circles
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

        // 11. Whitening
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

        // 12. Face lift
        if (s.facelift > 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, s.facelift / 100 * 0.1, "vertical"); }

        // 13. Jawline
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

        // 14. Cheekbone
        if (s.cheekbone !== 0) {
          const lCX = (lEye[0].x + jaw[0].x) / 2, rCX = (rEye[3].x + jaw[16].x) / 2;
          const cY = (lEye[0].y + jaw[8].y) / 2;
          const st = s.cheekbone / 100 * 0.1, r = 25;
          const tmp = new Uint8ClampedArray(d);
          for (const cx of [lCX, rCX]) {
            for (let y = cY - r; y < cY + r; y++) {
              for (let x = cx - r; x < cx + r; x++) {
                if (x < 0 || x >= w || y < 0 || y >= h) continue;
                const dx = x - cx, dy = y - cY, dist = Math.sqrt(dx * dx + dy * dy);
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

        // 15. Chin
        if (s.chin !== 0) {
          const chinY = jaw[8].y, st = s.chin / 100 * 0.15, r = 20;
          const tmp = new Uint8ClampedArray(d);
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

        // 16. Philtrum
        if (s.philtrum !== 0) {
          const pTop = nose[6].y, pBot = mouth[0].y, pCY = (pTop + pBot) / 2;
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
          const temp = s.temperature / 100 * 30, sat = s.saturation / 100, con = s.contrast / 100, bri = s.brightness / 100 * 50;
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

        // Sharpen
        if (s.sharpen > 0) {
          const gd = ctx.getImageData(0, 0, w, h);
          const amount = s.sharpen / 100 * 1.5;
          const orig = new Uint8ClampedArray(gd.data);
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              for (let c = 0; c < 3; c++) {
                const sharp = orig[idx + c] * 5 - orig[((y - 1) * w + x) * 4 + c] - orig[((y + 1) * w + x) * 4 + c] - orig[(y * w + x - 1) * 4 + c] - orig[(y * w + x + 1) * 4 + c];
                gd.data[idx + c] = Math.max(0, Math.min(255, orig[idx + c] + sharp * amount));
              }
            }
          }
          ctx.putImageData(gd, 0, 0);
        }

        // 17. Background blur
        if (s.blur_bg > 0 && lm) {
          applyBackgroundBlur(ctx, canvas, lm, s.blur_bg / 100);
        }

        // 18. Apply blemish patches
        if (blemishCanvasRef.current) {
          ctx.drawImage(blemishCanvasRef.current, 0, 0);
        }
      }

      // 19. Frame
      if (frameId !== "none") {
        applyFrame(ctx, canvas, frameId);
      }

      // 20. Text overlays
      for (const txt of texts) {
        ctx.font = `bold ${txt.size}px "Noto Sans SC", sans-serif`;
        ctx.fillStyle = txt.color;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 3;
        ctx.textAlign = "center";
        if (selectedOverlay === txt.id) {
          ctx.save();
          ctx.strokeStyle = "#F5A891";
          ctx.lineWidth = 2;
          const metrics = ctx.measureText(txt.text);
          const tw = metrics.width;
          ctx.strokeRect(txt.x - tw / 2 - 4, txt.y - txt.size - 4, tw + 8, txt.size + 8);
          ctx.restore();
        }
        ctx.strokeText(txt.text, txt.x, txt.y);
        ctx.fillText(txt.text, txt.x, txt.y);
      }

      // 21. Sticker overlays
      for (const sticker of stickers) {
        ctx.font = `${sticker.size}px serif`;
        ctx.textAlign = "center";
        if (selectedOverlay === sticker.id) {
          ctx.save();
          ctx.strokeStyle = "#F5A891";
          ctx.lineWidth = 2;
          ctx.strokeRect(sticker.x - sticker.size / 2 - 4, sticker.y - sticker.size - 4, sticker.size + 8, sticker.size + 8);
          ctx.restore();
        }
        ctx.fillText(sticker.emoji, sticker.x, sticker.y);
      }

      // 22. Face mesh visualization
      if (showMesh && lm) {
        ctx.strokeStyle = "rgba(255, 184, 161, 0.6)";
        ctx.lineWidth = 1;
        for (const point of lm) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
  }, [frameId, texts, stickers, showMesh, selectedOverlay]);

  // Background blur algorithm
  const applyBackgroundBlur = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, lm: Landmarks, intensity: number) => {
    const w = canvas.width, h = canvas.height;
    const jaw = lm.slice(0, 17);
    const fL = Math.min(...lm.map(p => p.x)) - 20;
    const fR = Math.max(...lm.map(p => p.x)) + 20;
    const fT = Math.min(...lm.map(p => p.y)) - 30;
    const fB = Math.max(...lm.map(p => p.y)) + 20;

    // Create face mask
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = w; maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext("2d")!;
    maskCtx.fillStyle = "white";
    maskCtx.beginPath();
    maskCtx.moveTo(jaw[0].x, jaw[0].y);
    for (let i = 1; i < jaw.length; i++) {
      maskCtx.lineTo(jaw[i].x, jaw[i].y);
    }
    maskCtx.closePath();
    maskCtx.fill();

    // Blur the entire image
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = w; blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext("2d")!;
    blurCtx.filter = `blur(${Math.round(intensity * 15)}px)`;
    blurCtx.drawImage(canvas, 0, 0);

    // Composite: keep face sharp, blur background
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
  }, []);

  // Blemish removal on click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;
    const x = Math.max(0, Math.min(canvas.width - 1, rawX));
    const y = Math.max(0, Math.min(canvas.height - 1, rawY));

    if (!blemishMode) return;
    const ctx = canvas.getContext("2d")!;
    const r = brushSize;

    // Sample surrounding pixels and blend
    const imageData = ctx.getImageData(x - r, y - r, r * 2, r * 2);
    const data = imageData.data;
    let sr = 0, sg = 0, sb = 0, c = 0;
    for (let py = 0; py < r * 2; py++) {
      for (let px = 0; px < r * 2; px++) {
        const dist = Math.sqrt((px - r) ** 2 + (py - r) ** 2);
        if (dist > r) continue;
        const idx = (py * r * 2 + px) * 4;
        sr += data[idx]; sg += data[idx + 1]; sb += data[idx + 2]; c++;
      }
    }
    if (c === 0) return;
    const avgR = sr / c, avgG = sg / c, avgB = sb / c;

    // Paint average color in a circle
    if (!blemishCanvasRef.current) {
      blemishCanvasRef.current = document.createElement("canvas");
      blemishCanvasRef.current.width = canvas.width;
      blemishCanvasRef.current.height = canvas.height;
    }
    const bCtx = blemishCanvasRef.current.getContext("2d")!;
    const grad = bCtx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${avgR}, ${avgG}, ${avgB}, 1)`);
    grad.addColorStop(1, `rgba(${avgR}, ${avgG}, ${avgB}, 0)`);
    bCtx.fillStyle = grad;
    bCtx.fillRect(x - r, y - r, r * 2, r * 2);

    // Re-render
    render(settings);
  }, [blemishMode, brushSize, render, settings]);

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

          // Reset blemish canvas
          blemishCanvasRef.current = null;

          // Detect face
          setDetecting(true);
          try {
            const api = faceApiRef.current || await import("face-api.js");
            faceApiRef.current = api;
            const det = await api.default
              .detectSingleFace(canvas, new api.default.TinyFaceDetectorOptions())
              .withFaceLandmarks();
            setDetecting(false);
            if (det) {
              setFaceOk(true);
              landmarksRef.current = det.landmarks.positions;
            } else {
              setFaceOk(false);
              landmarksRef.current = null;
            }
          } catch (err) {
            console.error("Face detection failed:", err);
            setDetecting(false);
            setFaceOk(false);
            landmarksRef.current = null;
          }
          historyRef.current = [{ ...INITIAL }];
          historyIdxRef.current = 0;
          setHistoryIdx(0);
          setSettings({ ...INITIAL });
          setTexts([]); setStickers([]); setFrameId("none");
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
    setSettings(next); render(next); pushHistory(next);
  }, [render, pushHistory]);

  const handleAutoEnhance = useCallback(() => {
    const canvas = canvasRef.current;
    const lm = landmarksRef.current;
    if (!canvas || !lm) {
      const next = { ...INITIAL, smooth: 50, slim: 15, bigeye: 10, whiten: 20, sharpen: 10 };
      setSettings(next); render(next); pushHistory(next);
      return;
    }
    const next = analyzeFaceAndCalcParams(canvas, lm);
    setSettings(next); render(next); pushHistory(next);
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
    setSettings({ ...INITIAL }); render(INITIAL); pushHistory(INITIAL);
    setTexts([]); setStickers([]); setFrameId("none");
    blemishCanvasRef.current = null;
  }, [render, pushHistory]);

  const addText = useCallback(() => {
    if (!newText || !canvasRef.current) return;
    const canvas = canvasRef.current;
    setTexts(prev => [...prev, {
      id: `t${Date.now()}`, text: newText,
      x: canvas.width / 2, y: canvas.height / 2,
      size: 48, color: newTextColor,
    }]);
    setNewText(""); setShowTextPanel(false);
    render(settings);
  }, [newText, newTextColor, render, settings]);

  const addSticker = useCallback((emoji: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    setStickers(prev => [...prev, {
      id: `s${Date.now()}`, emoji,
      x: canvas.width / 2, y: canvas.height / 2, size: 64,
    }]);
    render(settings);
  }, [render, settings]);

  const deleteOverlay = useCallback((id: string) => {
    setTexts(prev => prev.filter(t => t.id !== id));
    setStickers(prev => prev.filter(s => s.id !== id));
    setSelectedOverlay(null);
    setTimeout(() => render(settings), 0);
  }, [render, settings]);

  const getOverlayAt = useCallback((rawX: number, rawY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (rawX - rect.left) * scaleX;
    const y = (rawY - rect.top) * scaleY;

    for (const s of stickers) {
      if (Math.abs(x - s.x) < s.size / 2 + 10 && Math.abs(y - s.y) < s.size / 2 + 10) return s.id;
    }
    for (const txt of texts) {
      const approxW = txt.text.length * txt.size * 0.5;
      const approxH = txt.size;
      if (x > txt.x - approxW / 2 && x < txt.x + approxW / 2 && y > txt.y - approxH && y < txt.y + 10) return txt.id;
    }
    return null;
  }, [texts, stickers]);

  const onOverlayMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const id = getOverlayAt(e.clientX, e.clientY);
    if (id) {
      e.preventDefault();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const overlay = [...texts, ...stickers].find(o => o.id === id);
      if (overlay) {
        draggingRef.current = { id, offsetX: x - overlay.x, offsetY: y - overlay.y };
      }
      setSelectedOverlay(id);
    } else {
      setSelectedOverlay(null);
    }
  }, [texts, stickers, getOverlayAt]);

  const onOverlayMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX - draggingRef.current.offsetX;
    const y = (e.clientY - rect.top) * scaleY - draggingRef.current.offsetY;
    const { id } = draggingRef.current;
    setTexts(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
    setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
    render(settings);
  }, [render, settings]);

  const onOverlayMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const onOverlayContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const id = getOverlayAt(e.clientX, e.clientY);
    if (id) deleteOverlay(id);
  }, [getOverlayAt, deleteOverlay]);

  const onCompareMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!compareDrag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setComparePos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
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
              <button type="button" className="editor-btn" disabled={historyIdx <= 0} onClick={undo} aria-label={t("editor.undo")}>↩</button>
              <button type="button" className="editor-btn" disabled={historyIdx >= historyRef.current.length - 1} onClick={redo} aria-label={t("editor.redo")}>↪</button>
              <button type="button" className="editor-btn" onClick={handleAutoEnhance}>⚡</button>
              <button type="button" className={`editor-btn ${showMesh ? "active" : ""}`} onClick={() => setShowMesh(!showMesh)}>🗺</button>
              <button type="button" className="editor-btn" onClick={() => setShowCompare(!showCompare)}>⇔</button>
              <button type="button" className="editor-btn" onClick={() => setShowTextPanel(!showTextPanel)}>T</button>
              <button type="button" className="editor-btn" onClick={() => setShowStickerPanel(!showStickerPanel)}>😊</button>
              <button type="button" className="editor-btn" onClick={() => setShowFramePanel(!showFramePanel)}>🖼</button>
              <button type="button" className="editor-btn" onClick={handleReset}>⟲</button>
              <button type="button" className="editor-btn editor-btn--primary" onClick={() => setShowExport(true)}>↓</button>
            </>
          )}
          {detecting && <span className="editor-detecting">{t("editor.detecting")}</span>}
          {faceOk && <span className="editor-face-ok">✓</span>}
        </div>

        {/* Text input panel */}
        {showTextPanel && (
          <div className="editor-popup-panel">
            <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder={t("editor.textPlaceholder")} className="editor-text-input" />
            <input type="color" value={newTextColor} onChange={e => setNewTextColor(e.target.value)} className="editor-color-input" />
            <button type="button" className="editor-btn editor-btn--primary" onClick={addText}>{t("editor.addText")}</button>
          </div>
        )}

        {/* Sticker panel */}
        {showStickerPanel && (
          <div className="editor-popup-panel editor-sticker-panel">
            {STICKERS.map(s => (
              <button key={s} type="button" className="editor-sticker-btn" onClick={() => addSticker(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Frame panel */}
        {showFramePanel && (
          <div className="editor-popup-panel editor-frame-panel">
            {FRAMES.map(f => (
              <button key={f.id} type="button" className={`editor-frame-btn ${frameId === f.id ? "active" : ""}`} onClick={() => { setFrameId(f.id); render(settings); }}>
                {t(f.labelKey as any)}
              </button>
            ))}
          </div>
        )}

        <div className="editor-workspace">
          <div className="editor-canvas-container">
            <canvas
              ref={canvasRef}
              className="editor-canvas"
              style={showCompare ? { clipPath: `inset(0 ${100 - comparePos}% 0 0)` } : undefined}
              onClick={blemishMode ? handleCanvasClick : undefined}
              onMouseDown={onOverlayMouseDown}
              onMouseMove={onOverlayMouseMove}
              onMouseUp={onOverlayMouseUp}
              onContextMenu={onOverlayContextMenu}
              role="img"
              aria-label={t("editor.canvasLabel")}
            />
            {showCompare && originalRef.current && (
              <>
                <img src={originalRef.current.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", clipPath: `inset(0 0 0 ${comparePos}%)` }} />
                <div className="editor-compare-line" style={{ left: `${comparePos}%` }} onMouseDown={() => setCompareDrag(true)} onTouchStart={() => setCompareDrag(true)}>
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
                    onClick={() => { setCat(c.key); if (TOOLS[c.key]?.length) setTool(TOOLS[c.key][0].key); }}>
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
                    {currentTools?.map(tl => (
                      <button key={tl.key} type="button" className={`editor-tool-btn ${tool === tl.key ? "active" : ""}`}
                        onClick={() => { setTool(tl.key); setBlemishMode(tl.key === "blemish"); }}>
                        <span className="editor-tool-icon">{tl.icon}</span>
                        <span className="editor-tool-label">{t(tl.labelKey as any)}</span>
                      </button>
                    ))}
                  </div>
                  {tool === "blemish" && (
                    <div className="editor-slider-group">
                      <label>{t("editor.brushSize")}<span className="editor-slider-value">{brushSize}px</span></label>
                      <input type="range" min="5" max="50" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="editor-slider" />
                    </div>
                  )}
                  {tool !== "blemish" && currentTools?.some(tl => tl.key === tool) && (
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
                  )}
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
                  <input type="range" min="10" max="100" value={exportQuality} onChange={e => setExportQuality(Number(e.target.value))} />
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

// Helper: Apply warp distortion
function applyWarp(d: Uint8ClampedArray, w: number, h: number, cx: number, cy: number, fL: number, fR: number, fT: number, fB: number, strength: number, axis: "horizontal" | "vertical") {
  const tmp = new Uint8ClampedArray(d);
  const range = axis === "horizontal" ? (fR - fL) / 2 : (fB - fT) / 2;
  for (let y = fT; y < fB; y++) {
    for (let x = fL; x < fR; x++) {
      const dist = axis === "horizontal" ? (x - cx) / range : (y - cy) / range;
      const warp = 1 - strength * dist * dist;
      const sx = axis === "horizontal" ? Math.round(cx + (x - cx) * warp) : x;
      const sy = axis === "vertical" ? Math.round(cy + (y - cy) * warp) : y;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const di = (y * w + x) * 4, si = (sy * w + sx) * 4;
        tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
      }
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = tmp[i];
}

// Helper: Apply frame
function applyFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frameId: string) {
  const frame = FRAMES.find(f => f.id === frameId);
  if (!frame || frameId === "none") return;
  const w = canvas.width, h = canvas.height;
  const pad = frame.padding || 0;
  const padBottom = (frame as { paddingBottom?: number }).paddingBottom ?? pad;

  // Resize canvas to fit frame
  const newW = w + pad * 2;
  const newH = h + pad + padBottom;
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = newW;
  tmpCanvas.height = newH;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  if (!tmpCtx) return;

  // Fill background
  tmpCtx.fillStyle = frame.bg || "transparent";
  tmpCtx.fillRect(0, 0, newW, newH);

  // Rounded rect clip
  if (frame.borderRadius) {
    tmpCtx.beginPath();
    tmpCtx.roundRect(0, 0, newW, newH, frame.borderRadius);
    tmpCtx.clip();
    // Re-fill after clip
    tmpCtx.fillStyle = frame.bg || "transparent";
    tmpCtx.fillRect(0, 0, newW, newH);
  }

  // Draw the original canvas content inside the frame
  tmpCtx.drawImage(canvas, pad, pad);

  // Resize the main canvas
  canvas.width = newW;
  canvas.height = newH;
  ctx.drawImage(tmpCanvas, 0, 0);
}

// Helper: Smart auto-enhance based on face analysis
function analyzeFaceAndCalcParams(canvas: HTMLCanvasElement, lm: Landmarks): BeautySettings {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  const lEye = lm.slice(36, 42), rEye = lm.slice(42, 48);
  const nose = lm.slice(27, 36);

  const fL = Math.min(...lm.map(p => p.x)), fR = Math.max(...lm.map(p => p.x));
  const fT = Math.min(...lm.map(p => p.y)), fB = Math.max(...lm.map(p => p.y));
  const faceW = fR - fL, faceH = fB - fT;
  const aspectRatio = faceW / faceH;

  const eyeW = Math.max(...rEye.map(p => p.x)) - Math.min(...lEye.map(p => p.x));
  const eyeRatio = eyeW / faceW;

  const noseW = Math.max(...nose.map(p => p.x)) - Math.min(...nose.map(p => p.x));
  const noseRatio = noseW / faceW;

  const cx = (fL + fR) / 2, cy = (fT + fB) / 2;
  const sampleR = Math.min(faceW, faceH) * 0.2;
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;
  const brightnesses: number[] = [];

  for (let y = cy - sampleR; y < cy + sampleR; y += 3) {
    for (let x = cx - sampleR; x < cx + sampleR; x += 3) {
      const ppx = Math.round(x), ppy = Math.round(y);
      if (ppx < 0 || ppx >= w || ppy < 0 || ppy >= h) continue;
      const idx = (ppy * w + ppx) * 4;
      brightnesses.push(0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2]);
    }
  }

  const avgBrightness = brightnesses.length > 0 ? brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length : 128;
  const variance = brightnesses.length > 1
    ? brightnesses.reduce((s, v) => s + (v - avgBrightness) ** 2, 0) / brightnesses.length : 400;

  return {
    ...INITIAL,
    smooth: variance > 800 ? 65 : variance > 400 ? 55 : 45,
    whiten: avgBrightness < 100 ? 40 : avgBrightness < 140 ? 25 : 15,
    slim: aspectRatio > 0.75 ? 25 : aspectRatio > 0.6 ? 15 : 8,
    bigeye: eyeRatio < 0.2 ? 18 : eyeRatio < 0.3 ? 12 : 5,
    nose: noseRatio > 0.35 ? 15 : 8,
    lip: 15, sharpen: 12, contrast: 8, temperature: 5,
    facelift: 10, jawline: aspectRatio > 0.7 ? 12 : 5,
    forehead: 30, eyebag: 25, darkcircle: 20,
  };
}

function isSkin(x: number, y: number, lEye: Landmarks, rEye: Landmarks, mouth: Landmarks, jaw: Landmarks): boolean {
  if (lEye.some(p => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (rEye.some(p => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (mouth.some(p => Math.hypot(p.x - x, p.y - y) < 12)) return false;
  const fL = Math.min(...jaw.map(p => p.x)), fR = Math.max(...jaw.map(p => p.x));
  const fT = Math.min(...jaw.map(p => p.y)) - 30, fB = Math.max(...jaw.map(p => p.y)) + 10;
  return x >= fL && x <= fR && y >= fT && y <= fB;
}
