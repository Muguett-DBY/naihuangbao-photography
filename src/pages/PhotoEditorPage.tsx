import "../styles/pages.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { BeautySettings, BeautyCategory, BeautyTool, TextOverlay, StickerOverlay, FrameId } from "../types/photo-editor";
import { INITIAL, FILTERS, FRAMES, STICKERS, CATEGORIES, TOOLS, CATEGORY_DESCRIPTIONS, MAX_HISTORY } from "../data/editor-constants";
import { prepareFaceApiBackend, loadFaceApiModels } from "../lib/photo-processing";
import { applyFrame, analyzeFaceAndCalcParams, detectFaceLandmarks, type Landmarks } from "../lib/editor-utils";
import {
  applyBackgroundBlur as applyBackgroundBlurFn,
  applyBackgroundRemove as applyBackgroundRemoveFn,
  applyBackgroundSolid as applyBackgroundSolidFn,
  applyBackgroundGradient as applyBackgroundGradientFn,
  applyMakeup as applyMakeupFn,
  applyLocalAdjustment as applyLocalAdjustmentFn,
  applyColorSplash as applyColorSplashFn,
  applyDoubleExposure as applyDoubleExposureFn,
  applyFaceEffects,
  applyColorAdjustments,
  applyPostProcessing,
} from "../lib/editor-effects";

const MODEL_URL = "/models";

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
  const faceApiRef = useRef<typeof import("face-api.js") | null>(null);
  const originalSizeRef = useRef<{ w: number; h: number } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const modelsReadyRef = useRef(false);
  const modelErrorRef = useRef(false);
  const faceModelsPromiseRef = useRef<Promise<boolean> | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [cat, setCat] = useState<BeautyCategory>("beauty");
  const [tool, setTool] = useState<BeautyTool>("smooth");
  const [settings, setSettings] = useState<BeautySettings>({ ...INITIAL });
  const [faceOk, setFaceOk] = useState(false);
  const [faceError, setFaceError] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [exportQuality, setExportQuality] = useState(92);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("jpeg");
  const [compareDrag, setCompareDrag] = useState(false);
  const [showMesh, setShowMesh] = useState(false);

  useEffect(() => {
    modelsReadyRef.current = modelsReady;
  }, [modelsReady]);

  useEffect(() => {
    modelErrorRef.current = modelError;
  }, [modelError]);

  // New feature states
  const [frameId, setFrameId] = useState<FrameId>("none");
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

  // Feature 1: Background
  const [bgSolidColor, setBgSolidColor] = useState("#ffffff");
  const [bgGradientStart, setBgGradientStart] = useState("#ff6b6b");
  const [bgGradientEnd, setBgGradientEnd] = useState("#4ecdc4");

  // Feature 2: Makeup
  const [lipstickColor, setLipstickColor] = useState("#e74c3c");
  const [blushColor, setBlushColor] = useState("#f8a5c2");
  const [eyeshadowColor, setEyeshadowColor] = useState("#a29bfe");

  // Feature 3: Local adjustment brush
  const localBrushMaskRef = useRef<ImageData | null>(null);
  const [localBrushActive, setLocalBrushActive] = useState(false);
  const [localBrushTool, setLocalBrushTool] = useState<"local_bright" | "local_warm" | "local_sat">("local_bright");
  const localBrushCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Feature 4: Color Splash
  const [colorSplashHue, setColorSplashHue] = useState(0);
  const [colorSplashRange, setColorSplashRange] = useState(30);

  // Export modal Escape key
  useEffect(() => {
    if (!showExport) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowExport(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showExport]);

  // Feature 5: Double Exposure
  const [doubleExposureImage, setDoubleExposureImage] = useState<HTMLImageElement | null>(null);
  const [blendMode, setBlendMode] = useState<"overlay" | "screen" | "soft-light">("overlay");
  const [doubleExposureOpacity, setDoubleExposureOpacity] = useState(50);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load models
  useEffect(() => {
    let m = true;
    setLoadProgress(0);
    const loadPromise = loadFaceApiModels((progress) => {
      if (m) setLoadProgress(progress);
    })
      .then(success => {
        if (m) {
          modelsReadyRef.current = success;
          modelErrorRef.current = !success;
          setModelsReady(success);
          setModelError(!success);
          setLoadProgress(success ? 100 : 0);
        }
        return success;
      });
    faceModelsPromiseRef.current = loadPromise;
    return () => { m = false; };
  }, []);

  const waitForFaceModels = useCallback(async () => {
    if (modelsReadyRef.current) return true;
    return (await faceModelsPromiseRef.current) ?? false;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

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

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => { cancelAnimationFrame(rafRef.current); };
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

      // Reset canvas to original dimensions if a frame was applied
      const orig = originalSizeRef.current;
      if (orig && (canvas.width !== orig.w || canvas.height !== orig.h)) {
        canvas.width = orig.w;
        canvas.height = orig.h;
      }

      // Draw original
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get image data for pixel manipulation
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = id.data;
      const w2 = canvas.width, h2 = canvas.height;

      // Apply face effects if landmarks available
      if (lm) {
        applyFaceEffects(d, w2, h2, lm, s);
      } // end if(lm) for face-specific effects

      // Color adjustments — work without face detection too
      applyColorAdjustments(d, w2, h2, s);

      ctx.putImageData(id, 0, 0);

      // Post-processing — vignette, grain, sharpen
      applyPostProcessing(ctx, canvas, s);

      // Face-dependent features (makeup, brush, color splash, DE, bg, blemish)
      if (lm) {
        const w = w2, h = h2;

        if (s.lipstick > 0 || s.blush > 0 || s.eyeshadow > 0 || s.eyeliner > 0) {
          applyMakeup(ctx, w, h, lm, s, lipstickColor, blushColor, eyeshadowColor);
        }

        if (localBrushMaskRef.current && (s.local_bright !== 0 || s.local_warm !== 0 || s.local_sat !== 0)) {
          applyLocalAdjustment(ctx, w, h, localBrushMaskRef.current, s);
        }

        if (s.color_splash > 0) {
          applyColorSplash(ctx, w, h, colorSplashHue, colorSplashRange, s.color_splash / 100);
        }

        if (s.double_exposure > 0 && doubleExposureImage) {
          applyDoubleExposure(ctx, canvas, doubleExposureImage, blendMode, s.double_exposure / 100, doubleExposureOpacity / 100);
        }

        if (s.blur_bg > 0) {
          applyBackgroundBlur(ctx, canvas, lm, s.blur_bg / 100);
        }
        if (s.bg_remove > 0) {
          applyBackgroundRemove(ctx, canvas, lm, s.bg_remove / 100);
        }
        if (s.bg_solid > 0) {
          applyBackgroundSolid(ctx, canvas, lm, s.bg_solid / 100, bgSolidColor);
        }
        if (s.bg_gradient > 0) {
          applyBackgroundGradient(ctx, canvas, lm, s.bg_gradient / 100, bgGradientStart, bgGradientEnd);
        }

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
  }, [frameId, texts, stickers, showMesh, selectedOverlay, bgSolidColor, bgGradientStart, bgGradientEnd, lipstickColor, blushColor, eyeshadowColor, colorSplashHue, colorSplashRange, doubleExposureImage, blendMode, doubleExposureOpacity]);

  // Background effects — delegated to editor-effects.ts
  const applyBackgroundBlur = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, lm: Landmarks, intensity: number) => {
    applyBackgroundBlurFn(ctx, canvas, lm, intensity);
  }, []);

  const applyBackgroundRemove = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, lm: Landmarks, intensity: number) => {
    applyBackgroundRemoveFn(ctx, canvas, lm, intensity);
  }, []);

  const applyBackgroundSolid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, lm: Landmarks, intensity: number, color: string) => {
    applyBackgroundSolidFn(ctx, canvas, lm, intensity, color);
  }, []);

  const applyBackgroundGradient = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, lm: Landmarks, intensity: number, c1: string, c2: string) => {
    applyBackgroundGradientFn(ctx, canvas, lm, intensity, c1, c2);
  }, []);

  const applyMakeup = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, lm: Landmarks, s: BeautySettings, lipCol: string, blushCol: string, shadowCol: string) => {
    applyMakeupFn(ctx, w, h, lm, s, lipCol, blushCol, shadowCol);
  }, []);

  const applyLocalAdjustment = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, mask: ImageData, s: BeautySettings) => {
    applyLocalAdjustmentFn(ctx, w, h, mask, s);
  }, []);

  const applyColorSplash = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, targetHue: number, range: number, intensity: number) => {
    applyColorSplashFn(ctx, w, h, targetHue, range, intensity);
  }, []);

  const applyDoubleExposure = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img2: HTMLImageElement, mode: string, intensity: number, opacity: number) => {
    applyDoubleExposureFn(ctx, canvas, img2, mode, intensity, opacity);
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

    // Clamp so getImageData region stays within canvas
    const sx = Math.max(r, Math.min(canvas.width - r, x));
    const sy = Math.max(r, Math.min(canvas.height - r, y));

    // Sample surrounding pixels and blend
    const imageData = ctx.getImageData(sx - r, sy - r, r * 2, r * 2);
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
    const grad = bCtx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, `rgba(${avgR}, ${avgG}, ${avgB}, 1)`);
    grad.addColorStop(1, `rgba(${avgR}, ${avgG}, ${avgB}, 0)`);
    bCtx.fillStyle = grad;
    bCtx.fillRect(sx - r, sy - r, r * 2, r * 2);

    // Re-render
    render(settings);
  }, [blemishMode, brushSize, render, settings]);

  const handleUploadClick = useCallback(() => {
    uploadRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const MAX_DIM = 2000;
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        originalRef.current = img;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = w; canvas.height = h;
        originalSizeRef.current = { w, h };
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setLoading(false);

        // Reset blemish canvas
        blemishCanvasRef.current = null;

        // Detect face
        setDetecting(true);
        setFaceError(false);
        setFaceOk(false);
        try {
          const ready = await waitForFaceModels();
          if (ready) {
            const api = faceApiRef.current || await import("face-api.js");
            await prepareFaceApiBackend(api);
            faceApiRef.current = api;
            const landmarks = await detectFaceLandmarks(api, canvas);
            if (landmarks) {
              setFaceOk(true);
              landmarksRef.current = landmarks;
            } else {
              setFaceError(true);
              landmarksRef.current = null;
            }
          } else {
            setFaceError(false);
            landmarksRef.current = null;
          }
        } catch (err) {
          console.error("Face detection failed:", err);
          modelErrorRef.current = true;
          setModelError(true);
          setFaceError(false);
          landmarksRef.current = null;
        } finally {
          setDetecting(false);
        }
        historyRef.current = [{ ...INITIAL }];
        historyIdxRef.current = 0;
        setHistoryIdx(0);
        setSettings({ ...INITIAL });
        setTexts([]); setStickers([]); setFrameId("none");
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setLoading(false);
      console.error("FileReader error:", reader.error);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }, [waitForFaceModels]);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const syntheticEvent = { target: { files: [file], value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(syntheticEvent);
    }
  }, [handleFileChange]);

  // Feature 3: Local brush painting
  const handleBrushPaint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!localBrushActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (!localBrushCanvasRef.current) {
      localBrushCanvasRef.current = document.createElement("canvas");
      localBrushCanvasRef.current.width = canvas.width;
      localBrushCanvasRef.current.height = canvas.height;
    }

    const bCtx = localBrushCanvasRef.current.getContext("2d")!;
    bCtx.fillStyle = "rgba(255,255,255,0.8)";
    bCtx.beginPath();
    bCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    bCtx.fill();
    localBrushMaskRef.current = bCtx.getImageData(0, 0, canvas.width, canvas.height);
    render(settings);
  }, [localBrushActive, brushSize, render, settings]);

  const clearBrushMask = useCallback(() => {
    localBrushCanvasRef.current = null;
    localBrushMaskRef.current = null;
    render(settings);
  }, [render, settings]);

  // Feature 5: Double exposure upload
  const handleDoubleExposureUpload = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => { setDoubleExposureImage(img); render(settings); };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }, [render, settings]);

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
    // Update refs directly for performance during drag
    for (const t of texts) { if (t.id === id) { t.x = x; t.y = y; } }
    for (const s of stickers) { if (s.id === id) { s.x = x; s.y = y; } }
    render(settings);
  }, [render, settings, texts, stickers]);

  const onOverlayMouseUp = useCallback(() => {
    if (draggingRef.current) {
      const { id } = draggingRef.current;
      setTexts(prev => prev.map(t => t.id === id ? { ...t } : t));
      setStickers(prev => prev.map(s => s.id === id ? { ...s } : s));
    }
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
      <ErrorBoundary>
      <div className={`editor-root ${isDragOver ? "editor-drag-over" : ""}`} onMouseMove={onCompareMove} onMouseUp={() => setCompareDrag(false)} onTouchMove={onCompareMove} onTouchEnd={() => setCompareDrag(false)} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <header className="editor-header">
          <h1>{t("editor.title")}</h1>
          <p>{t("editor.subtitle")}</p>
          {!modelsReady && !modelError && (
            <div className="editor-loading-models">
              <div className="editor-loading-bar">
                <div className="editor-loading-bar-fill" style={{ width: `${Math.max(loadProgress, 5)}%` }} />
              </div>
              <span>{t("editor.loadingModels")}{loadProgress > 0 ? ` ${Math.round(loadProgress)}%` : ""}</span>
            </div>
          )}
          {modelError && <p className="editor-loading-models" role="alert">{t("editor.loadingModels")} — <button type="button" className="editor-btn" style={{fontSize: "0.8rem", padding: "4px 12px"}} onClick={() => window.location.reload()}>{t("editor.reset")}</button></p>}
        </header>

        <div className="editor-toolbar">
          <button type="button" className="editor-btn editor-btn--primary" onClick={handleUploadClick} aria-label={t("editor.upload")} title={t("editor.upload")}>{t("editor.upload")}</button>
          <input ref={uploadRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
          {originalRef.current && (
            <>
              <button type="button" className="editor-btn" disabled={historyIdx <= 0} onClick={undo} aria-label={t("editor.undo")} title={t("editor.undo")}>↩</button>
              <button type="button" className="editor-btn" disabled={historyIdx >= historyRef.current.length - 1} onClick={redo} aria-label={t("editor.redo")} title={t("editor.redo")}>↪</button>
              <button type="button" className="editor-btn" onClick={handleAutoEnhance} aria-label={t("editor.auto")} title={t("editor.auto")}>⚡</button>
              <button type="button" className={`editor-btn ${showMesh ? "active" : ""}`} onClick={() => setShowMesh(!showMesh)} aria-pressed={showMesh} aria-label="Face mesh" title="Face mesh">🗺</button>
              <button type="button" className="editor-btn" onClick={() => setShowCompare(!showCompare)} aria-label={t("editor.compare")} title={t("editor.compare")}>⇔</button>
              <button type="button" className="editor-btn" onClick={() => setShowTextPanel(!showTextPanel)} aria-label={t("editor.addText")} title={t("editor.addText")}>T</button>
              <button type="button" className="editor-btn" onClick={() => setShowStickerPanel(!showStickerPanel)} aria-label={t("editor.uploadOverlay")} title={t("editor.uploadOverlay")}>😊</button>
              <button type="button" className="editor-btn" onClick={() => setShowFramePanel(!showFramePanel)} aria-label={t("editor.frame.none")} title={t("editor.frame.none")}>🖼</button>
              <button type="button" className="editor-btn" onClick={handleReset} aria-label={t("editor.reset")} title={t("editor.reset")}>⟲</button>
              <button type="button" className="editor-btn editor-btn--primary" onClick={() => setShowExport(true)} aria-label={t("editor.export")} title={t("editor.export")}>↓</button>
            </>
          )}
          {detecting && <span className="editor-detecting" aria-live="polite">{t("editor.detecting")}</span>}
          {faceOk && <span className="editor-face-ok" role="status" aria-label={t("editor.faceDetected")}>✓</span>}
          {faceError && !detecting && <span className="editor-status-warning" role="status" aria-live="polite">{t("editor.noFaceDetected")}</span>}
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
              <button key={f.id} type="button" className={`editor-frame-btn ${frameId === f.id ? "active" : ""}`} onClick={() => { setFrameId(f.id as FrameId); render(settings); }}>
                {t(f.labelKey as any)}
              </button>
            ))}
          </div>
        )}

        {/* Feature 1: Background controls */}
        {tool === "bg_solid" && cat === "bg" && (
          <div className="editor-popup-panel">
            <label className="editor-label">{t("editor.bgColor")}</label>
            <input type="color" value={bgSolidColor} onChange={e => setBgSolidColor(e.target.value)} className="editor-color-input" />
          </div>
        )}
        {tool === "bg_gradient" && cat === "bg" && (
          <div className="editor-popup-panel">
            <label className="editor-label">{t("editor.gradientStart")}</label>
            <input type="color" value={bgGradientStart} onChange={e => setBgGradientStart(e.target.value)} className="editor-color-input" />
            <label className="editor-label">{t("editor.gradientEnd")}</label>
            <input type="color" value={bgGradientEnd} onChange={e => setBgGradientEnd(e.target.value)} className="editor-color-input" />
          </div>
        )}

        {/* Feature 2: Makeup color controls */}
        {tool === "lipstick" && cat === "makeup" && (
          <div className="editor-popup-panel">
            <label className="editor-label">{t("editor.lipColor")}</label>
            <input type="color" value={lipstickColor} onChange={e => setLipstickColor(e.target.value)} className="editor-color-input" />
          </div>
        )}
        {tool === "blush" && cat === "makeup" && (
          <div className="editor-popup-panel">
            <label className="editor-label">{t("editor.blushColor")}</label>
            <input type="color" value={blushColor} onChange={e => setBlushColor(e.target.value)} className="editor-color-input" />
          </div>
        )}
        {tool === "eyeshadow" && cat === "makeup" && (
          <div className="editor-popup-panel">
            <label className="editor-label">{t("editor.eyeshadowColor")}</label>
            <input type="color" value={eyeshadowColor} onChange={e => setEyeshadowColor(e.target.value)} className="editor-color-input" />
          </div>
        )}

        {/* Feature 3: Local brush controls */}
        {cat === "tools" && ["local_bright", "local_warm", "local_sat"].includes(tool) && (
          <div className="editor-popup-panel editor-brush-controls">
            <button type="button" className={`editor-btn ${localBrushActive ? "active" : ""}`} onClick={() => { setLocalBrushActive(!localBrushActive); setLocalBrushTool(tool as typeof localBrushTool); }}>
              {localBrushActive ? t("editor.brushStop") : t("editor.brushStart")}
            </button>
            <button type="button" className="editor-btn" onClick={clearBrushMask}>{t("editor.brushClear")}</button>
          </div>
        )}

        {/* Feature 4: Color splash controls */}
        {tool === "color_splash" && cat === "tools" && (
          <div className="editor-popup-panel editor-color-splash-controls">
            <label className="editor-label">{t("editor.targetHue")}: {colorSplashHue}°</label>
            <input type="range" min="0" max="360" value={colorSplashHue} onChange={e => { setColorSplashHue(Number(e.target.value)); render(settings); }} className="editor-slider" />
            <label className="editor-label">{t("editor.hueRange")}: {colorSplashRange}°</label>
            <input type="range" min="10" max="120" value={colorSplashRange} onChange={e => { setColorSplashRange(Number(e.target.value)); render(settings); }} className="editor-slider" />
          </div>
        )}

        {/* Feature 5: Double exposure controls */}
        {tool === "double_exposure" && cat === "tools" && (
          <div className="editor-popup-panel editor-double-exposure-controls">
            <button type="button" className="editor-btn" onClick={handleDoubleExposureUpload}>
              {doubleExposureImage ? t("editor.changeImage") : t("editor.uploadOverlay")}
            </button>
            <select value={blendMode} onChange={e => { setBlendMode(e.target.value as typeof blendMode); render(settings); }} className="editor-select">
              <option value="overlay">{t("editor.blendOverlay")}</option>
              <option value="screen">{t("editor.blendScreen")}</option>
              <option value="soft-light">{t("editor.blendSoftLight")}</option>
            </select>
            <label className="editor-label">{t("editor.opacity")}: {doubleExposureOpacity}%</label>
            <input type="range" min="0" max="100" value={doubleExposureOpacity} onChange={e => { setDoubleExposureOpacity(Number(e.target.value)); render(settings); }} className="editor-slider" />
          </div>
        )}

        <div className="editor-workspace">
          <div className="editor-canvas-container">
            {!originalRef.current && !loading && (
              <div className="editor-canvas--empty">
                {isDragOver ? (
                  <div className="editor-drop-zone">
                    <span className="editor-drop-icon">📸</span>
                    <p>{t("editor.dropHere", "Drop your photo here")}</p>
                  </div>
                ) : (
                  <>
                    <p>{t("editor.subtitle")}</p>
                    <p className="editor-drop-hint">{t("editor.dropHint", "or drag and drop an image")}</p>
                  </>
                )}
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="editor-canvas"
              style={{
                ...(showCompare ? { clipPath: `inset(0 ${100 - comparePos}% 0 0)` } : undefined),
                ...(blemishMode || localBrushActive ? { cursor: "crosshair" } : undefined),
              }}
              onClick={blemishMode ? handleCanvasClick : undefined}
              onMouseDown={localBrushActive ? (e) => { handleBrushPaint(e); } : onOverlayMouseDown}
              onMouseMove={localBrushActive ? handleBrushPaint : onOverlayMouseMove}
              onMouseUp={onOverlayMouseUp}
              onTouchStart={(e) => {
                if (blemishMode) { handleCanvasClick(e as any); }
                else if (localBrushActive) { handleBrushPaint(e as any); }
                else { onOverlayMouseDown(e as any); }
              }}
              onTouchMove={(e) => {
                if (localBrushActive) { handleBrushPaint(e as any); }
                else { onOverlayMouseMove(e as any); }
              }}
              onTouchEnd={onOverlayMouseUp}
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
                    aria-pressed={cat === c.key}
                    onClick={() => { setCat(c.key); if (TOOLS[c.key]?.length) setTool(TOOLS[c.key][0].key); }}>
                    <span>{c.icon}</span><span>{t(c.labelKey as any)}</span>
                  </button>
                ))}
              </div>
              <p className="editor-cat-desc">{t(CATEGORY_DESCRIPTIONS[cat] as any)}</p>

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
                        aria-pressed={tool === tl.key}
                        onClick={() => { setTool(tl.key); setBlemishMode(tl.key === "blemish"); setLocalBrushActive(["local_bright", "local_warm", "local_sat"].includes(tl.key)); setLocalBrushTool(tl.key as typeof localBrushTool); }}>
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
              <div className="editor-export-presets">
                <button type="button" className={`editor-preset-btn ${exportFormat === "jpeg" && exportQuality === 85 ? "active" : ""}`} onClick={() => { setExportFormat("jpeg"); setExportQuality(85); }}>
                  <span className="editor-preset-icon">📱</span>
                  <span className="editor-preset-label">{t("editor.presetSocial", "Social")}</span>
                  <span className="editor-preset-desc">JPEG 85%</span>
                </button>
                <button type="button" className={`editor-preset-btn ${exportFormat === "jpeg" && exportQuality === 75 ? "active" : ""}`} onClick={() => { setExportFormat("jpeg"); setExportQuality(75); }}>
                  <span className="editor-preset-icon">⚡</span>
                  <span className="editor-preset-label">{t("editor.presetQuick", "Quick")}</span>
                  <span className="editor-preset-desc">JPEG 75%</span>
                </button>
                <button type="button" className={`editor-preset-btn ${exportFormat === "png" ? "active" : ""}`} onClick={() => { setExportFormat("png"); setExportQuality(100); }}>
                  <span className="editor-preset-icon">🖨</span>
                  <span className="editor-preset-label">{t("editor.presetPrint", "Print")}</span>
                  <span className="editor-preset-desc">PNG</span>
                </button>
              </div>
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
      </ErrorBoundary>
    </PageTransition>
  );
}
