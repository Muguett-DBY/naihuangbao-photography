import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

type BeautyCategory = "beauty" | "reshape" | "color" | "filter";

type BeautyTool =
  | "smooth" | "slim" | "bigeye" | "whiten" | "sharpen"
  | "nose" | "lip" | "forehead" | "eyebag" | "darkcircle"
  | "blemish" | "facelift" | "jawline"
  | "temperature" | "saturation" | "contrast" | "brightness" | "vignette" | "grain";

interface BeautySettings {
  smooth: number; slim: number; bigeye: number; whiten: number; sharpen: number;
  nose: number; lip: number; forehead: number; eyebag: number; darkcircle: number;
  blemish: number; facelift: number; jawline: number;
  temperature: number; saturation: number; contrast: number; brightness: number; vignette: number; grain: number;
}

const INITIAL_SETTINGS: BeautySettings = {
  smooth: 0, slim: 0, bigeye: 0, whiten: 0, sharpen: 0,
  nose: 0, lip: 0, forehead: 0, eyebag: 0, darkcircle: 0,
  blemish: 0, facelift: 0, jawline: 0,
  temperature: 0, saturation: 0, contrast: 0, brightness: 0, vignette: 0, grain: 0,
};

const CATEGORIES: { key: BeautyCategory; icon: string; labelKey: string }[] = [
  { key: "beauty", icon: "✨", labelKey: "editor.cat.beauty" },
  { key: "reshape", icon: "💎", labelKey: "editor.cat.reshape" },
  { key: "color", icon: "🎨", labelKey: "editor.cat.color" },
  { key: "filter", icon: "📷", labelKey: "editor.cat.filter" },
];

const TOOLS_BY_CATEGORY: Record<BeautyCategory, { key: BeautyTool; icon: string; labelKey: string }[]> = {
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
  ],
  color: [
    { key: "temperature", icon: "🌡", labelKey: "editor.temperature" },
    { key: "saturation", icon: "🎭", labelKey: "editor.saturation" },
    { key: "contrast", icon: "🌗", labelKey: "editor.contrast" },
    { key: "brightness", icon: "☀", labelKey: "editor.brightness" },
  ],
  filter: [
    { key: "vignette", icon: "🖼", labelKey: "editor.vignette" },
    { key: "grain", icon: "🎞", labelKey: "editor.grain" },
  ],
};

export default function PhotoEditorPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<BeautyCategory>("beauty");
  const [activeTool, setActiveTool] = useState<BeautyTool>("smooth");
  const [settings, setSettings] = useState<BeautySettings>({ ...INITIAL_SETTINGS });
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    import("face-api.js").then(async (faceapi) => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        if (mounted) setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleFileUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLoading(true);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          originalImageRef.current = img;
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          setLoading(false);
          detectFace();
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const detectFace = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !modelsLoaded) return;
    setDetecting(true);
    const faceapi = await import("face-api.js");
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    setDetecting(false);
    if (detection) {
      setFaceDetected(true);
      applyAllEffects(detection.landmarks.positions, settings);
    } else {
      setFaceDetected(false);
    }
  }, [modelsLoaded, settings]);

  const applyAllEffects = useCallback(async (
    landmarks: { x: number; y: number }[],
    s: BeautySettings
  ) => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const jawline = landmarks.slice(0, 17);
    const leftEye = landmarks.slice(36, 42);
    const rightEye = landmarks.slice(42, 48);
    const nose = landmarks.slice(27, 36);
    const mouth = landmarks.slice(48, 68);
    const leftBrow = landmarks.slice(17, 22);
    const rightBrow = landmarks.slice(22, 27);

    const faceLeft = Math.min(...landmarks.map(p => p.x));
    const faceRight = Math.max(...landmarks.map(p => p.x));
    const faceTop = Math.min(...landmarks.map(p => p.y));
    const faceBottom = Math.max(...landmarks.map(p => p.y));
    const faceCenterX = (faceLeft + faceRight) / 2;
    const faceCenterY = (faceTop + faceBottom) / 2;

    // 1. Skin Smoothing
    if (s.smooth > 0) {
      const radius = Math.floor(s.smooth / 10) + 1;
      const smoothData = new Uint8ClampedArray(data);
      for (let y = faceTop; y < faceBottom; y++) {
        for (let x = faceLeft; x < faceRight; x++) {
          if (isSkinRegion(x, y, leftEye, rightEye, mouth, jawline)) {
            const idx = (y * canvas.width + x) * 4;
            let r = 0, g = 0, b = 0, count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                  const nIdx = (ny * canvas.width + nx) * 4;
                  r += data[nIdx]; g += data[nIdx + 1]; b += data[nIdx + 2]; count++;
                }
              }
            }
            smoothData[idx] = r / count;
            smoothData[idx + 1] = g / count;
            smoothData[idx + 2] = b / count;
          }
        }
      }
      for (let i = 0; i < data.length; i++) data[i] = smoothData[i];
    }

    // 2. Face Slimming
    if (s.slim > 0) {
      const strength = s.slim / 100 * 0.15;
      const tempData = new Uint8ClampedArray(data);
      for (let y = faceTop; y < faceBottom; y++) {
        for (let x = faceLeft; x < faceRight; x++) {
          const distFromCenter = (x - faceCenterX) / ((faceRight - faceLeft) / 2);
          const warp = 1 - strength * distFromCenter * distFromCenter;
          const srcX = Math.round(faceCenterX + (x - faceCenterX) * warp);
          if (srcX >= 0 && srcX < canvas.width) {
            const dstIdx = (y * canvas.width + x) * 4;
            const srcIdx = (y * canvas.width + srcX) * 4;
            tempData[dstIdx] = data[srcIdx]; tempData[dstIdx + 1] = data[srcIdx + 1]; tempData[dstIdx + 2] = data[srcIdx + 2];
          }
        }
      }
      for (let i = 0; i < data.length; i++) data[i] = tempData[i];
    }

    // 3. Eye Enlargement
    if (s.bigeye > 0) {
      const eyes = [...leftEye, ...rightEye];
      const eyeCX = eyes.reduce((ss, p) => ss + p.x, 0) / eyes.length;
      const eyeCY = eyes.reduce((ss, p) => ss + p.y, 0) / eyes.length;
      const eyeR = Math.max(
        Math.max(...leftEye.map(p => p.x)) - Math.min(...leftEye.map(p => p.x)),
        Math.max(...rightEye.map(p => p.x)) - Math.min(...rightEye.map(p => p.x))
      ) / 2;
      const strength = s.bigeye / 100 * 0.3;
      const tempData = new Uint8ClampedArray(data);
      for (let y = Math.max(0, eyeCY - eyeR * 2); y < Math.min(canvas.height, eyeCY + eyeR * 2); y++) {
        for (let x = Math.max(0, eyeCX - eyeR * 2); x < Math.min(canvas.width, eyeCX + eyeR * 2); x++) {
          const dx = x - eyeCX, dy = y - eyeCY, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < eyeR * 1.5) {
            const factor = 1 + strength * Math.max(0, 1 - dist / (eyeR * 1.5));
            const srcX = Math.round(eyeCX + dx / factor);
            const srcY = Math.round(eyeCY + dy / factor);
            if (srcX >= 0 && srcX < canvas.width && srcY >= 0 && srcY < canvas.height) {
              const dstIdx = (y * canvas.width + x) * 4;
              const srcIdx = (srcY * canvas.width + srcX) * 4;
              tempData[dstIdx] = data[srcIdx]; tempData[dstIdx + 1] = data[srcIdx + 1]; tempData[dstIdx + 2] = data[srcIdx + 2];
            }
          }
        }
      }
      for (let i = 0; i < data.length; i++) data[i] = tempData[i];
    }

    // 4. Whitening
    if (s.whiten > 0) {
      const strength = s.whiten / 100 * 40;
      for (let y = faceTop; y < faceBottom; y++) {
        for (let x = faceLeft; x < faceRight; x++) {
          if (isSkinRegion(x, y, leftEye, rightEye, mouth, jawline)) {
            const idx = (y * canvas.width + x) * 4;
            data[idx] = Math.min(255, data[idx] + strength);
            data[idx + 1] = Math.min(255, data[idx + 1] + strength);
            data[idx + 2] = Math.min(255, data[idx + 2] + strength * 0.8);
          }
        }
      }
    }

    // 5. Nose Slimming
    if (s.nose > 0) {
      const noseCX = nose.reduce((ss, p) => ss + p.x, 0) / nose.length;
      const noseCY = nose.reduce((ss, p) => ss + p.y, 0) / nose.length;
      const noseR = 30;
      const strength = s.nose / 100 * 0.2;
      const tempData = new Uint8ClampedArray(data);
      for (let y = Math.max(0, noseCY - noseR); y < Math.min(canvas.height, noseCY + noseR); y++) {
        for (let x = Math.max(0, noseCX - noseR); x < Math.min(canvas.width, noseCX + noseR); x++) {
          const dx = x - noseCX, dy = y - noseCY, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < noseR) {
            const factor = 1 + strength * Math.max(0, 1 - dist / noseR);
            const srcX = Math.round(noseCX + dx / factor);
            if (srcX >= 0 && srcX < canvas.width) {
              const dstIdx = (y * canvas.width + x) * 4;
              const srcIdx = (y * canvas.width + srcX) * 4;
              tempData[dstIdx] = data[srcIdx]; tempData[dstIdx + 1] = data[srcIdx + 1]; tempData[dstIdx + 2] = data[srcIdx + 2];
            }
          }
        }
      }
      for (let i = 0; i < data.length; i++) data[i] = tempData[i];
    }

    // 6. Lip Enhancement
    if (s.lip > 0) {
      const lipCY = mouth.reduce((ss, p) => ss + p.y, 0) / mouth.length;
      const lipLeft = Math.min(...mouth.map(p => p.x));
      const lipRight = Math.max(...mouth.map(p => p.x));
      const strength = s.lip / 100 * 30;
      for (let y = Math.max(0, lipCY - 15); y < Math.min(canvas.height, lipCY + 15); y++) {
        for (let x = lipLeft; x < lipRight; x++) {
          const idx = (y * canvas.width + x) * 4;
          data[idx] = Math.min(255, data[idx] + strength * 1.2);
          data[idx + 1] = Math.max(0, data[idx + 1] - strength * 0.3);
          data[idx + 2] = Math.max(0, data[idx + 2] - strength * 0.2);
        }
      }
    }

    // 7. Forehead Smoothing
    if (s.forehead > 0) {
      const browCY = Math.min(...leftBrow.map(p => p.y), ...rightBrow.map(p => p.y));
      const radius = Math.floor(s.forehead / 10) + 1;
      for (let y = Math.max(0, browCY - 40); y < browCY; y++) {
        for (let x = faceLeft; x < faceRight; x++) {
          const idx = (y * canvas.width + x) * 4;
          let r = 0, g = 0, b = 0, count = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                const nIdx = (ny * canvas.width + nx) * 4;
                r += data[nIdx]; g += data[nIdx + 1]; b += data[nIdx + 2]; count++;
              }
            }
          }
          data[idx] = r / count; data[idx + 1] = g / count; data[idx + 2] = b / count;
        }
      }
    }

    // 8. Eye Bag Removal
    if (s.eyebag > 0) {
      const eyeBagLeft = leftEye.reduce((ss, p) => ss + p.y, 0) / leftEye.length + 10;
      const eyeBagRight = rightEye.reduce((ss, p) => ss + p.y, 0) / rightEye.length + 10;
      const radius = Math.floor(s.eyebag / 10) + 1;
      for (const eyeCY of [eyeBagLeft, eyeBagRight]) {
        for (let y = eyeCY - 12; y < eyeCY + 12; y++) {
          for (let x = faceLeft; x < faceRight; x++) {
            if (y >= 0 && y < canvas.height) {
              const idx = (y * canvas.width + x) * 4;
              let r = 0, g = 0, b = 0, count = 0;
              for (let dy = -radius; dy <= radius; dy++) {
                const ny = y + dy;
                if (ny >= 0 && ny < canvas.height) {
                  const nIdx = (ny * canvas.width + x) * 4;
                  r += data[nIdx]; g += data[nIdx + 1]; b += data[nIdx + 2]; count++;
                }
              }
              data[idx] = r / count; data[idx + 1] = g / count; data[idx + 2] = b / count;
            }
          }
        }
      }
    }

    // 9. Dark Circle Removal
    if (s.darkcircle > 0) {
      const leftEyeCY = leftEye.reduce((ss, p) => ss + p.y, 0) / leftEye.length;
      const rightEyeCY = rightEye.reduce((ss, p) => ss + p.y, 0) / rightEye.length;
      const strength = s.darkcircle / 100 * 25;
      for (const eyeCY of [leftEyeCY, rightEyeCY]) {
        for (let y = eyeCY; y < eyeCY + 15; y++) {
          for (let x = faceLeft; x < faceRight; x++) {
            if (y >= 0 && y < canvas.height) {
              const idx = (y * canvas.width + x) * 4;
              data[idx] = Math.min(255, data[idx] + strength);
              data[idx + 1] = Math.min(255, data[idx + 1] + strength * 0.8);
              data[idx + 2] = Math.min(255, data[idx + 2] + strength * 0.6);
            }
          }
        }
      }
    }

    // 10. Face Lift
    if (s.facelift > 0) {
      const strength = s.facelift / 100 * 0.1;
      const tempData = new Uint8ClampedArray(data);
      for (let y = faceTop; y < faceBottom; y++) {
        const ratio = (y - faceTop) / (faceBottom - faceTop);
        const warp = 1 - strength * ratio * ratio;
        for (let x = faceLeft; x < faceRight; x++) {
          const srcY = Math.round(faceCenterY + (y - faceCenterY) * warp);
          if (srcY >= 0 && srcY < canvas.height) {
            const dstIdx = (y * canvas.width + x) * 4;
            const srcIdx = (srcY * canvas.width + x) * 4;
            tempData[dstIdx] = data[srcIdx]; tempData[dstIdx + 1] = data[srcIdx + 1]; tempData[dstIdx + 2] = data[srcIdx + 2];
          }
        }
      }
      for (let i = 0; i < data.length; i++) data[i] = tempData[i];
    }

    // 11. Jawline Definition
    if (s.jawline > 0) {
      const strength = s.jawline / 100 * 0.12;
      const tempData = new Uint8ClampedArray(data);
      for (let y = faceTop; y < faceBottom; y++) {
        for (let x = faceLeft; x < faceRight; x++) {
          const distFromCenter = Math.abs(x - faceCenterX) / ((faceRight - faceLeft) / 2);
          if (distFromCenter > 0.6) {
            const warp = 1 - strength * (distFromCenter - 0.6);
            const srcX = Math.round(faceCenterX + (x - faceCenterX) * warp);
            if (srcX >= 0 && srcX < canvas.width) {
              const dstIdx = (y * canvas.width + x) * 4;
              const srcIdx = (y * canvas.width + srcX) * 4;
              tempData[dstIdx] = data[srcIdx]; tempData[dstIdx + 1] = data[srcIdx + 1]; tempData[dstIdx + 2] = data[srcIdx + 2];
            }
          }
        }
      }
      for (let i = 0; i < data.length; i++) data[i] = tempData[i];
    }

    // Color adjustments
    if (s.temperature !== 0 || s.saturation !== 0 || s.contrast !== 0 || s.brightness !== 0) {
      const temp = s.temperature / 100 * 30;
      const sat = s.saturation / 100;
      const con = s.contrast / 100;
      const bri = s.brightness / 100 * 50;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        // Temperature
        r = Math.min(255, r + temp); b = Math.max(0, b - temp);
        // Saturation
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (1 + sat) * (r - gray); g = gray + (1 + sat) * (g - gray); b = gray + (1 + sat) * (b - gray);
        // Contrast
        r = ((r / 255 - 0.5) * (1 + con) + 0.5) * 255;
        g = ((g / 255 - 0.5) * (1 + con) + 0.5) * 255;
        b = ((b / 255 - 0.5) * (1 + con) + 0.5) * 255;
        // Brightness
        r += bri; g += bri; b += bri;
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Post-processing overlays
    const ctx2 = canvas.getContext("2d")!;

    // Vignette
    if (s.vignette > 0) {
      const gradient = ctx2.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${s.vignette / 100 * 0.6})`);
      ctx2.fillStyle = gradient;
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Grain
    if (s.grain > 0) {
      const grainData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
      const gd = grainData.data;
      const intensity = s.grain / 100 * 40;
      for (let i = 0; i < gd.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity;
        gd[i] += noise; gd[i + 1] += noise; gd[i + 2] += noise;
      }
      ctx2.putImageData(grainData, 0, 0);
    }
  }, []);

  const handleSettingChange = useCallback((tool: BeautyTool, value: number) => {
    setSettings(prev => {
      const next = { ...prev, [tool]: value };
      if (faceDetected && originalImageRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          import("face-api.js").then(fp =>
            fp.default
              .detectSingleFace(canvas, new fp.default.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .then(d => { if (d) applyAllEffects(d.landmarks.positions, next); })
          );
        }
      }
      return next;
    });
  }, [faceDetected, applyAllEffects]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "beautified-photo.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleReset = useCallback(() => {
    setSettings({ ...INITIAL_SETTINGS });
    if (originalImageRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.drawImage(originalImageRef.current, 0, 0);
    }
  }, []);

  const currentTools = TOOLS_BY_CATEGORY[activeCategory];

  return (
    <PageTransition>
      <div className="editor-root">
        <header className="editor-header">
          <h1>{t("editor.title")}</h1>
          <p>{t("editor.subtitle")}</p>
          {!modelsLoaded && <p className="editor-loading-models">{t("editor.loadingModels")}</p>}
        </header>

        <div className="editor-toolbar">
          <button type="button" className="editor-btn editor-btn--primary" onClick={handleFileUpload}>
            {t("editor.upload")}
          </button>
          {originalImageRef.current && (
            <>
              <button type="button" className="editor-btn" onClick={handleReset}>{t("editor.reset")}</button>
              <button type="button" className="editor-btn editor-btn--primary" onClick={handleDownload}>
                {t("editor.download")}
              </button>
            </>
          )}
          {detecting && <span className="editor-detecting">{t("editor.detecting")}</span>}
          {faceDetected && <span className="editor-face-ok">✓ {t("editor.faceDetected")}</span>}
        </div>

        <div className="editor-workspace">
          <div className="editor-canvas-container">
            <canvas ref={canvasRef} className="editor-canvas" />
            {loading && <div className="editor-overlay">{t("editor.loadingImage")}</div>}
          </div>

          {originalImageRef.current && (
            <div className="editor-beauty-panel">
              <div className="editor-categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`editor-cat-btn ${activeCategory === cat.key ? "active" : ""}`}
                    onClick={() => { setActiveCategory(cat.key); setActiveTool(TOOLS_BY_CATEGORY[cat.key][0].key); }}
                  >
                    <span>{cat.icon}</span>
                    <span>{t(cat.labelKey as any)}</span>
                  </button>
                ))}
              </div>

              <div className="editor-tools">
                {currentTools.map(tool => (
                  <button
                    key={tool.key}
                    type="button"
                    className={`editor-tool-btn ${activeTool === tool.key ? "active" : ""}`}
                    onClick={() => setActiveTool(tool.key)}
                  >
                    <span className="editor-tool-icon">{tool.icon}</span>
                    <span className="editor-tool-label">{t(tool.labelKey as any)}</span>
                  </button>
                ))}
              </div>

              <div className="editor-slider-group">
                <label>
                  {currentTools.find(tl => tl.key === activeTool) && t(currentTools.find(tl => tl.key === activeTool)!.labelKey as any)}
                  <span className="editor-slider-value">{settings[activeTool]}%</span>
                </label>
                <input
                  type="range" min="0" max="100"
                  value={settings[activeTool]}
                  onChange={(e) => handleSettingChange(activeTool, Number(e.target.value))}
                  className="editor-slider"
                />
              </div>

              <div className="editor-presets">
                <button type="button" className="editor-preset-btn" onClick={() => setSettings({ ...INITIAL_SETTINGS, smooth: 50, slim: 15, bigeye: 10, whiten: 20 })}>
                  {t("editor.preset.natural")}
                </button>
                <button type="button" className="editor-preset-btn" onClick={() => setSettings({ ...INITIAL_SETTINGS, smooth: 70, slim: 30, bigeye: 20, whiten: 40, nose: 15, lip: 20 })}>
                  {t("editor.preset.beauty")}
                </button>
                <button type="button" className="editor-preset-btn" onClick={() => setSettings({ ...INITIAL_SETTINGS, smooth: 35, slim: 10, bigeye: 8, whiten: 15, sharpen: 20, contrast: 10 })}>
                  {t("editor.preset.portrait")}
                </button>
                <button type="button" className="editor-preset-btn" onClick={() => setSettings({ ...INITIAL_SETTINGS, smooth: 60, bigeye: 15, whiten: 30, temperature: -20, saturation: 15, vignette: 30 })}>
                  {t("editor.preset.vintage")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function isSkinRegion(
  x: number, y: number,
  leftEye: { x: number; y: number }[],
  rightEye: { x: number; y: number }[],
  mouth: { x: number; y: number }[],
  jawline: { x: number; y: number }[]
): boolean {
  if (leftEye.some(p => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (rightEye.some(p => Math.hypot(p.x - x, p.y - y) < 15)) return false;
  if (mouth.some(p => Math.hypot(p.x - x, p.y - y) < 12)) return false;
  const faceLeft = Math.min(...jawline.map(p => p.x));
  const faceRight = Math.max(...jawline.map(p => p.x));
  const faceTop = Math.min(...jawline.map(p => p.y)) - 30;
  const faceBottom = Math.max(...jawline.map(p => p.y)) + 10;
  return x >= faceLeft && x <= faceRight && y >= faceTop && y <= faceBottom;
}
