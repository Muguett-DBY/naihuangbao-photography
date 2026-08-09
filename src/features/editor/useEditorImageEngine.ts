import { useCallback, useEffect } from "react";
import { INITIAL, MAX_HISTORY } from "../../data/editor-constants";
import {
  applyBackgroundBlur,
  applyBackgroundGradient,
  applyBackgroundRemove,
  applyBackgroundSolid,
  applyColorAdjustments,
  applyColorSplash,
  applyDoubleExposure,
  applyFaceEffects,
  applyLocalAdjustment,
  applyMakeup,
  applyPostProcessing,
} from "../../lib/editor-effects";
import type { EditorProjectSnapshot } from "../../lib/editor-project-store";
import { prepareFaceApiBackend, loadFaceApiModels } from "../../lib/photo-processing";
import { applyFrame, detectFaceLandmarks } from "../../lib/editor-utils";
import type { BeautySettings } from "../../types/photo-editor";
import type { EditorImageLoadError, EditorState } from "./useEditorState";

type EditorImageEngineOptions = {
  skipInitialFaceDetection: boolean;
  releaseTransientTextures: () => void;
};

export function useEditorImageEngine(state: EditorState, options: EditorImageEngineOptions) {
  const startModelLoad = useCallback((loadOptions?: { force?: boolean }) => {
    if (state.faceModelsPromiseRef.current && !loadOptions?.force) return state.faceModelsPromiseRef.current;
    const requestId = state.modelLoadRequestRef.current + 1;
    state.modelLoadRequestRef.current = requestId;
    state.setModelLoadAttempt((attempt) => attempt + 1);
    state.setLoadProgress(0);
    state.setModelLoading(true);
    state.setModelError(false);
    state.setModelLoadIssue(null);
    state.setModelsReady(false);
    state.modelErrorRef.current = false;
    state.modelsReadyRef.current = false;
    const promise = loadFaceApiModels((progress) => {
      if (state.mountedRef.current && state.modelLoadRequestRef.current === requestId) state.setLoadProgress(progress);
    }).then((result) => {
      const success = result.ok;
      if (state.mountedRef.current && state.modelLoadRequestRef.current === requestId) {
        state.modelsReadyRef.current = success;
        state.modelErrorRef.current = !success;
        state.setModelsReady(success);
        state.setModelLoading(false);
        state.setModelError(!success);
        state.setModelLoadIssue(result.ok ? null : result.reason);
        state.setLoadProgress(success ? 100 : 0);
      }
      return success;
    }).finally(() => {
      if (state.modelLoadRequestRef.current === requestId && !state.modelsReadyRef.current) state.faceModelsPromiseRef.current = null;
    });
    state.faceModelsPromiseRef.current = promise;
    return promise;
  }, []);

  const retryModels = useCallback(() => {
    state.faceModelsPromiseRef.current = null;
    void startModelLoad({ force: true });
  }, [startModelLoad]);
  const waitForFaceModels = useCallback(async () => state.modelsReadyRef.current || await startModelLoad(), [startModelLoad]);

  const pushHistory = useCallback((settings: BeautySettings) => {
    const next = state.historyRef.current.slice(0, state.historyIdxRef.current + 1);
    next.push({ ...settings });
    if (next.length > MAX_HISTORY) next.shift();
    state.historyRef.current = next;
    state.historyIdxRef.current = next.length - 1;
    state.setHistoryIdx(next.length - 1);
  }, []);
  const undo = useCallback(() => {
    if (state.historyIdxRef.current <= 0) return;
    state.historyIdxRef.current -= 1;
    state.setHistoryIdx(state.historyIdxRef.current);
    state.setSettings({ ...state.historyRef.current[state.historyIdxRef.current] });
  }, []);
  const redo = useCallback(() => {
    if (state.historyIdxRef.current >= state.historyRef.current.length - 1) return;
    state.historyIdxRef.current += 1;
    state.setHistoryIdx(state.historyIdxRef.current);
    state.setSettings({ ...state.historyRef.current[state.historyIdxRef.current] });
  }, []);
  const jumpToHistory = useCallback((index: number) => {
    const snapshot = state.historyRef.current[index];
    if (!snapshot) return;
    state.historyIdxRef.current = index;
    state.setHistoryIdx(index);
    state.setSettings({ ...snapshot });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const render = useCallback((settings: BeautySettings) => {
    const canvas = state.canvasRef.current;
    const image = state.originalRef.current;
    const landmarks = state.landmarksRef.current;
    if (!canvas || !image) return;
    cancelAnimationFrame(state.rafRef.current);
    state.rafRef.current = requestAnimationFrame(() => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const originalSize = state.originalSizeRef.current;
      if (originalSize && (canvas.width !== originalSize.w || canvas.height !== originalSize.h)) {
        canvas.width = originalSize.w;
        canvas.height = originalSize.h;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      if (landmarks) applyFaceEffects(imageData.data, canvas.width, canvas.height, landmarks, settings);
      applyColorAdjustments(imageData.data, canvas.width, canvas.height, settings);
      context.putImageData(imageData, 0, 0);
      applyPostProcessing(context, canvas, settings);

      if (landmarks) {
        if (settings.lipstick > 0 || settings.blush > 0 || settings.eyeshadow > 0 || settings.eyeliner > 0) applyMakeup(context, canvas.width, canvas.height, landmarks, settings, state.lipstickColor, state.blushColor, state.eyeshadowColor);
        if (state.localBrushMaskRef.current && (settings.local_bright !== 0 || settings.local_warm !== 0 || settings.local_sat !== 0)) applyLocalAdjustment(context, canvas.width, canvas.height, state.localBrushMaskRef.current, settings);
        if (settings.color_splash > 0) applyColorSplash(context, canvas.width, canvas.height, state.colorSplashHue, state.colorSplashRange, settings.color_splash / 100);
        if (settings.double_exposure > 0 && state.doubleExposureImage) applyDoubleExposure(context, canvas, state.doubleExposureImage, state.blendMode, settings.double_exposure / 100, state.doubleExposureOpacity / 100);
        if (settings.blur_bg > 0) applyBackgroundBlur(context, canvas, landmarks, settings.blur_bg / 100);
        if (settings.bg_remove > 0) applyBackgroundRemove(context, canvas, landmarks, settings.bg_remove / 100);
        if (settings.bg_solid > 0) applyBackgroundSolid(context, canvas, landmarks, settings.bg_solid / 100, state.bgSolidColor);
        if (settings.bg_gradient > 0) applyBackgroundGradient(context, canvas, landmarks, settings.bg_gradient / 100, state.bgGradientStart, state.bgGradientEnd);
        if (state.blemishCanvasRef.current) context.drawImage(state.blemishCanvasRef.current, 0, 0);
      }

      if (state.frameId !== "none") applyFrame(context, canvas, state.frameId);
      for (const text of state.texts) {
        context.font = `bold ${text.size}px "Noto Sans SC", sans-serif`;
        context.fillStyle = text.color;
        context.strokeStyle = "rgba(0,0,0,0.5)";
        context.lineWidth = 3;
        context.textAlign = "center";
        if (state.selectedOverlay === text.id) {
          const width = context.measureText(text.text).width;
          context.save();
          context.strokeStyle = "#F5A891";
          context.lineWidth = 2;
          context.strokeRect(text.x - width / 2 - 4, text.y - text.size - 4, width + 8, text.size + 8);
          context.restore();
        }
        context.strokeText(text.text, text.x, text.y);
        context.fillText(text.text, text.x, text.y);
      }
      for (const sticker of state.stickers) {
        context.font = `${sticker.size}px serif`;
        context.textAlign = "center";
        if (state.selectedOverlay === sticker.id) {
          context.save();
          context.strokeStyle = "#F5A891";
          context.lineWidth = 2;
          context.strokeRect(sticker.x - sticker.size / 2 - 4, sticker.y - sticker.size - 4, sticker.size + 8, sticker.size + 8);
          context.restore();
        }
        context.fillText(sticker.emoji, sticker.x, sticker.y);
      }
      if (state.showMesh && landmarks) {
        context.strokeStyle = "rgba(255, 184, 161, 0.6)";
        context.lineWidth = 1;
        for (const point of landmarks) {
          context.beginPath();
          context.arc(point.x, point.y, 2, 0, Math.PI * 2);
          context.stroke();
        }
      }
    });
  }, [state.frameId, state.texts, state.stickers, state.showMesh, state.selectedOverlay, state.bgSolidColor, state.bgGradientStart, state.bgGradientEnd, state.lipstickColor, state.blushColor, state.eyeshadowColor, state.colorSplashHue, state.colorSplashRange, state.doubleExposureImage, state.blendMode, state.doubleExposureOpacity]);

  useEffect(() => {
    if (state.originalRef.current) render(state.settings);
  }, [render, state.settings]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = state.canvasRef.current;
    if (!canvas || !state.blemishMode) return;
    const rect = canvas.getBoundingClientRect();
    const radius = state.brushSize;
    const x = Math.max(radius, Math.min(canvas.width - radius, (event.clientX - rect.left) * canvas.width / rect.width));
    const y = Math.max(radius, Math.min(canvas.height - radius, (event.clientY - rect.top) * canvas.height / rect.height));
    const context = canvas.getContext("2d");
    if (!context) return;
    const sample = context.getImageData(x - radius, y - radius, radius * 2, radius * 2).data;
    let red = 0, green = 0, blue = 0, count = 0;
    for (let py = 0; py < radius * 2; py += 1) {
      for (let px = 0; px < radius * 2; px += 1) {
        if (Math.hypot(px - radius, py - radius) > radius) continue;
        const index = (py * radius * 2 + px) * 4;
        red += sample[index]; green += sample[index + 1]; blue += sample[index + 2]; count += 1;
      }
    }
    if (!count) return;
    if (!state.blemishCanvasRef.current) {
      state.blemishCanvasRef.current = document.createElement("canvas");
      state.blemishCanvasRef.current.width = canvas.width;
      state.blemishCanvasRef.current.height = canvas.height;
    }
    const brushContext = state.blemishCanvasRef.current.getContext("2d");
    if (!brushContext) return;
    const gradient = brushContext.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${red / count}, ${green / count}, ${blue / count}, 1)`);
    gradient.addColorStop(1, `rgba(${red / count}, ${green / count}, ${blue / count}, 0)`);
    brushContext.fillStyle = gradient;
    brushContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    render(state.settings);
  }, [render, state.blemishMode, state.brushSize, state.settings]);

  const loadImageFile = useCallback((file: File, loadOptions?: { skipFaceDetection?: boolean; project?: EditorProjectSnapshot }) => {
    options.releaseTransientTextures();
    const requestId = state.imageLoadRequestRef.current + 1;
    state.imageLoadRequestRef.current = requestId;
    const isCurrent = () => state.imageLoadRequestRef.current === requestId;
    const fail = (reason: EditorImageLoadError, error?: unknown) => {
      if (!isCurrent()) return;
      if (error) console.error("Editor image load failed:", error);
      state.setLoading(false); state.setDetecting(false); state.setFaceOk(false); state.setFaceError(false);
      state.landmarksRef.current = null;
      state.setImageLoadError(reason);
    };
    if (file.type && !file.type.startsWith("image/")) { fail("unsupported"); return; }
    state.setLoading(true); state.setDetecting(false); state.setFaceOk(false); state.setFaceError(false); state.setImageLoadError(null);
    state.landmarksRef.current = null;
    const reader = new FileReader();
    reader.onload = () => {
      if (!isCurrent() || typeof reader.result !== "string") { fail("read"); return; }
      const image = new Image();
      image.onload = async () => {
        if (!isCurrent()) return;
        const ratio = Math.min(1, 2000 / image.width, 2000 / image.height);
        const width = Math.round(image.width * ratio);
        const height = Math.round(image.height * ratio);
        const canvas = state.canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) { fail("canvas"); return; }
        canvas.width = width; canvas.height = height;
        state.originalSizeRef.current = { w: width, h: height };
        state.originalRef.current = image;
        context.drawImage(image, 0, 0, width, height);
        state.setLoading(false); state.setImageLoadError(null);
        state.blemishCanvasRef.current = null;
        state.sourceFileRef.current = file;
        state.setProjectSourceVersion((version) => version + 1);
        const project = loadOptions?.project;
        if (project) {
          state.historyRef.current = project.history.map((entry) => ({ ...entry }));
          state.historyIdxRef.current = Math.min(project.historyIndex, project.history.length - 1);
          state.setHistoryIdx(state.historyIdxRef.current);
          state.setSettings({ ...project.settings });
          state.setCat(project.activeCategory ?? (options.skipInitialFaceDetection ? "color" : "beauty"));
          state.setTool(project.activeTool ?? (options.skipInitialFaceDetection ? "temperature" : "smooth"));
          state.setActiveWorkflowGroup(project.activeWorkflow ?? (options.skipInitialFaceDetection ? "color" : "quick"));
          state.setTexts(project.texts.map((entry) => ({ ...entry })));
          state.setStickers(project.stickers.map((entry) => ({ ...entry })));
          state.setFrameId(project.frameId);
        } else {
          state.historyRef.current = [{ ...INITIAL }]; state.historyIdxRef.current = 0;
          state.setHistoryIdx(0); state.setSettings({ ...INITIAL }); state.setTexts([]); state.setStickers([]); state.setFrameId("none");
        }
        if (loadOptions?.skipFaceDetection) {
          state.setDetecting(false); state.setFaceError(false); state.setFaceOk(false); state.landmarksRef.current = null;
        } else {
          state.setDetecting(true); state.setFaceError(false); state.setFaceOk(false);
          try {
            if (await waitForFaceModels() && isCurrent()) {
              const api = state.faceApiRef.current || await import("face-api.js");
              if (!isCurrent()) return;
              await prepareFaceApiBackend(api);
              state.faceApiRef.current = api;
              const landmarks = await detectFaceLandmarks(api, canvas);
              if (!isCurrent()) return;
              state.landmarksRef.current = landmarks;
              state.setFaceOk(Boolean(landmarks));
              state.setFaceError(!landmarks);
            }
          } catch (error) {
            console.error("Face detection failed:", error);
            state.modelErrorRef.current = true; state.setModelError(true); state.setFaceError(false); state.landmarksRef.current = null;
          } finally {
            if (isCurrent()) state.setDetecting(false);
          }
        }
        if (isCurrent() && project) render(project.settings);
      };
      image.onerror = () => fail("decode");
      image.src = reader.result;
    };
    reader.onerror = () => fail("read", reader.error);
    reader.onabort = () => fail("read");
    reader.readAsDataURL(file);
  }, [options.releaseTransientTextures, options.skipInitialFaceDetection, render, waitForFaceModels]);

  const handleUploadClick = useCallback(() => state.uploadRef.current?.click(), []);
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) loadImageFile(file);
    event.target.value = "";
  }, [loadImageFile]);

  return { render, pushHistory, undo, redo, jumpToHistory, retryModels, handleCanvasClick, handleUploadClick, handleFileChange, loadImageFile };
}

export type EditorImageEngine = ReturnType<typeof useEditorImageEngine>;
