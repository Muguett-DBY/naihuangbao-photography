import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

type BeautyTool = "smooth" | "slim" | "bigeye" | "whiten" | "sharpen";

interface BeautySettings {
  smooth: number;
  slim: number;
  bigeye: number;
  whiten: number;
  sharpen: number;
}

export default function PhotoEditorPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [activeTool, setActiveTool] = useState<BeautyTool>("smooth");
  const [settings, setSettings] = useState<BeautySettings>({
    smooth: 50,
    slim: 0,
    bigeye: 0,
    whiten: 0,
    sharpen: 0,
  });
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load face-api.js models
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
    const img = originalImageRef.current;
    if (!canvas || !img || !modelsLoaded) return;

    setDetecting(true);
    const faceapi = await import("face-api.js");

    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    setDetecting(false);

    if (detection) {
      setFaceDetected(true);
      applyBeautification(detection.landmarks.positions, settings);
    } else {
      setFaceDetected(false);
    }
  }, [modelsLoaded, settings]);

  const applyBeautification = useCallback(async (
    landmarks: { x: number; y: number }[],
    currentSettings: BeautySettings
  ) => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Get image data for manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Extract face regions from landmarks
    const jawline = landmarks.slice(0, 17);
    const leftEye = landmarks.slice(36, 42);
    const rightEye = landmarks.slice(42, 48);
    const nose = landmarks.slice(27, 36);
    const mouth = landmarks.slice(48, 68);

    // Calculate face bounding box
    const faceLeft = Math.min(...landmarks.map(p => p.x));
    const faceRight = Math.max(...landmarks.map(p => p.x));
    const faceTop = Math.min(...landmarks.map(p => p.y));
    const faceBottom = Math.max(...landmarks.map(p => p.y));

    // 1. Skin Smoothing (磨皮) - Bilateral filter approximation
    if (currentSettings.smooth > 0) {
      const radius = Math.floor(currentSettings.smooth / 10) + 1;
      const smoothData = new Uint8ClampedArray(data);

      for (let y = faceTop; y < faceBottom; y++) {
        for (let x = faceLeft; x < faceRight; x++) {
          // Check if pixel is on skin (not on eyes, eyebrows, lips)
          if (isSkinRegion(x, y, leftEye, rightEye, mouth, jawline)) {
            const idx = (y * canvas.width + x) * 4;
            let r = 0, g = 0, b = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                  const nIdx = (ny * canvas.width + nx) * 4;
                  r += data[nIdx];
                  g += data[nIdx + 1];
                  b += data[nIdx + 2];
                  count++;
                }
              }
            }

            smoothData[idx] = r / count;
            smoothData[idx + 1] = g / count;
            smoothData[idx + 2] = b / count;
          }
        }
      }

      for (let i = 0; i < data.length; i++) {
        data[i] = smoothData[i];
      }
    }

    // 2. Face Slimming (瘦脸) - Mesh warping
    if (currentSettings.slim > 0) {
      const centerX = (faceLeft + faceRight) / 2;
      const strength = currentSettings.slim / 100 * 0.15;
      const tempData = new Uint8ClampedArray(data);

      for (let y = faceTop; y < faceBottom; y++) {
        for (let x = faceLeft; x < faceRight; x++) {
          const distFromCenter = (x - centerX) / ((faceRight - faceLeft) / 2);
          const warp = 1 - strength * distFromCenter * distFromCenter;
          const srcX = Math.round(centerX + (x - centerX) * warp);

          if (srcX >= 0 && srcX < canvas.width) {
            const dstIdx = (y * canvas.width + x) * 4;
            const srcIdx = (y * canvas.width + srcX) * 4;
            tempData[dstIdx] = data[srcIdx];
            tempData[dstIdx + 1] = data[srcIdx + 1];
            tempData[dstIdx + 2] = data[srcIdx + 2];
          }
        }
      }

      for (let i = 0; i < data.length; i++) {
        data[i] = tempData[i];
      }
    }

    // 3. Eye Enlargement (大眼) - Radial warp
    if (currentSettings.bigeye > 0) {
      const eyes = [...leftEye, ...rightEye];
      const eyeCenterX = eyes.reduce((s, p) => s + p.x, 0) / eyes.length;
      const eyeCenterY = eyes.reduce((s, p) => s + p.y, 0) / eyes.length;
      const eyeRadius = Math.max(
        Math.max(...leftEye.map(p => p.x)) - Math.min(...leftEye.map(p => p.x)),
        Math.max(...rightEye.map(p => p.x)) - Math.min(...rightEye.map(p => p.x))
      ) / 2;

      const strength = currentSettings.bigeye / 100 * 0.3;
      const tempData = new Uint8ClampedArray(data);

      for (let y = Math.max(0, eyeCenterY - eyeRadius * 2); y < Math.min(canvas.height, eyeCenterY + eyeRadius * 2); y++) {
        for (let x = Math.max(0, eyeCenterX - eyeRadius * 2); x < Math.min(canvas.width, eyeCenterX + eyeRadius * 2); x++) {
          const dx = x - eyeCenterX;
          const dy = y - eyeCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < eyeRadius * 1.5) {
            const factor = 1 + strength * Math.max(0, 1 - dist / (eyeRadius * 1.5));
            const srcX = Math.round(eyeCenterX + dx / factor);
            const srcY = Math.round(eyeCenterY + dy / factor);

            if (srcX >= 0 && srcX < canvas.width && srcY >= 0 && srcY < canvas.height) {
              const dstIdx = (y * canvas.width + x) * 4;
              const srcIdx = (srcY * canvas.width + srcX) * 4;
              tempData[dstIdx] = data[srcIdx];
              tempData[dstIdx + 1] = data[srcIdx + 1];
              tempData[dstIdx + 2] = data[srcIdx + 2];
            }
          }
        }
      }

      for (let i = 0; i < data.length; i++) {
        data[i] = tempData[i];
      }
    }

    // 4. Teeth/Face Whitening (美白)
    if (currentSettings.whiten > 0) {
      const strength = currentSettings.whiten / 100 * 40;
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

    ctx.putImageData(imageData, 0, 0);
  }, []);

  const handleSettingChange = useCallback((tool: BeautyTool, value: number) => {
    setSettings(prev => {
      const next = { ...prev, [tool]: value };
      // Re-apply with new settings if face was detected
      if (faceDetected && originalImageRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          const faceapi = import("face-api.js");
          faceapi.then(fp =>
            fp.default
              .detectSingleFace(canvas, new fp.default.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .then(detection => {
                if (detection) {
                  applyBeautification(detection.landmarks.positions, next);
                }
              })
          );
        }
      }
      return next;
    });
  }, [faceDetected, applyBeautification]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "beautified-photo.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleReset = useCallback(() => {
    setSettings({ smooth: 0, slim: 0, bigeye: 0, whiten: 0, sharpen: 0 });
    if (originalImageRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.drawImage(originalImageRef.current, 0, 0);
      }
    }
  }, []);

  const tools: { key: BeautyTool; icon: string; label: string }[] = [
    { key: "smooth", icon: "✨", label: t("editor.smooth") },
    { key: "slim", icon: "💎", label: t("editor.slim") },
    { key: "bigeye", icon: "👁", label: t("editor.bigeye") },
    { key: "whiten", icon: "☀", label: t("editor.whiten") },
  ];

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
              <button type="button" className="editor-btn" onClick={handleReset}>
                {t("editor.reset")}
              </button>
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
              <h3>{t("editor.beautyTools")}</h3>
              <div className="editor-tools">
                {tools.map(tool => (
                  <button
                    key={tool.key}
                    type="button"
                    className={`editor-tool-btn ${activeTool === tool.key ? "active" : ""}`}
                    onClick={() => setActiveTool(tool.key)}
                  >
                    <span className="editor-tool-icon">{tool.icon}</span>
                    <span className="editor-tool-label">{tool.label}</span>
                  </button>
                ))}
              </div>

              <div className="editor-slider-group">
                <label>
                  {tools.find(t => t.key === activeTool)?.label}
                  <span className="editor-slider-value">{settings[activeTool]}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings[activeTool]}
                  onChange={(e) => handleSettingChange(activeTool, Number(e.target.value))}
                  className="editor-slider"
                />
              </div>

              <div className="editor-presets">
                <button type="button" className="editor-preset-btn" onClick={() => setSettings({ smooth: 60, slim: 20, bigeye: 15, whiten: 30, sharpen: 0 })}>
                  {t("editor.preset.natural")}
                </button>
                <button type="button" className="editor-preset-btn" onClick={() => setSettings({ smooth: 80, slim: 35, bigeye: 25, whiten: 50, sharpen: 0 })}>
                  {t("editor.preset.beauty")}
                </button>
                <button type="button" className="editor-preset-btn" onClick={() => setSettings({ smooth: 40, slim: 10, bigeye: 10, whiten: 20, sharpen: 20 })}>
                  {t("editor.preset.portrait")}
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
  // Exclude eye regions
  const inEye = leftEye.some(p => Math.hypot(p.x - x, p.y - y) < 15) ||
    rightEye.some(p => Math.hypot(p.x - x, p.y - y) < 15);
  if (inEye) return false;

  // Exclude mouth region
  const inMouth = mouth.some(p => Math.hypot(p.x - x, p.y - y) < 12);
  if (inMouth) return false;

  // Include if within face bounding box (rough skin detection)
  const faceLeft = Math.min(...jawline.map(p => p.x));
  const faceRight = Math.max(...jawline.map(p => p.x));
  const faceTop = Math.min(...jawline.map(p => p.y)) - 30;
  const faceBottom = Math.max(...jawline.map(p => p.y)) + 10;

  return x >= faceLeft && x <= faceRight && y >= faceTop && y <= faceBottom;
}
