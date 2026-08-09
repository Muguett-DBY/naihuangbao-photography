import { useEffect, useRef, useState } from "react";
import { INITIAL } from "../../data/editor-constants";
import type { EditorWorkflowKey } from "../../data/editor-workflow";
import type { FaceModelLoadFailureReason } from "../../lib/photo-processing";
import type { EditorProjectSnapshot } from "../../lib/editor-project-store";
import type { Landmarks } from "../../lib/editor-utils";
import type { BeautyCategory, BeautySettings, BeautyTool, FrameId, StickerOverlay, TextOverlay } from "../../types/photo-editor";

export type EditorExportStatus = {
  state: "idle" | "exporting" | "ready" | "failed";
  messageKey: string;
};

export type EditorImageLoadError = "unsupported" | "read" | "decode" | "canvas";

export const EDITOR_IMAGE_LOAD_ERROR_KEYS: Record<EditorImageLoadError, string> = {
  unsupported: "editor.imageUnsupported",
  read: "editor.imageReadFailed",
  decode: "editor.imageDecodeFailed",
  canvas: "editor.imageCanvasFailed",
};

export function useEditorState(skipInitialFaceDetection: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLImageElement | null>(null);
  const landmarksRef = useRef<Landmarks | null>(null);
  const historyRef = useRef<BeautySettings[]>([{ ...INITIAL }]);
  const historyIdxRef = useRef(0);
  const rafRef = useRef(0);
  const blemishCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceApiRef = useRef<typeof import("face-api.js") | null>(null);
  const originalSizeRef = useRef<{ w: number; h: number } | null>(null);
  const sourceFileRef = useRef<File | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const modelsReadyRef = useRef(false);
  const modelErrorRef = useRef(false);
  const faceModelsPromiseRef = useRef<Promise<boolean> | null>(null);
  const recoveryRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const initialFileLoadedRef = useRef<File | null>(null);
  const imageLoadRequestRef = useRef(0);
  const modelLoadRequestRef = useRef(0);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const localBrushMaskRef = useRef<ImageData | null>(null);
  const localBrushCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<EditorImageLoadError | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [cat, setCat] = useState<BeautyCategory>(skipInitialFaceDetection ? "color" : "beauty");
  const [tool, setTool] = useState<BeautyTool>(skipInitialFaceDetection ? "temperature" : "smooth");
  const [settings, setSettings] = useState<BeautySettings>({ ...INITIAL });
  const [faceOk, setFaceOk] = useState(false);
  const [faceError, setFaceError] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [modelLoadIssue, setModelLoadIssue] = useState<FaceModelLoadFailureReason | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [holdingOriginal, setHoldingOriginal] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [exportQuality, setExportQuality] = useState(92);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("jpeg");
  const [compareDrag, setCompareDrag] = useState(false);
  const [showMesh, setShowMesh] = useState(false);
  const [modelLoadAttempt, setModelLoadAttempt] = useState(0);
  const [activeWorkflowGroup, setActiveWorkflowGroup] = useState<EditorWorkflowKey>(skipInitialFaceDetection ? "color" : "quick");
  const [exportStatus, setExportStatus] = useState<EditorExportStatus>({ state: "idle", messageKey: "editor.exportStatus.idle" });
  const [projectSourceVersion, setProjectSourceVersion] = useState(0);
  const [projectStatus, setProjectStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [recoverableProject, setRecoverableProject] = useState<EditorProjectSnapshot | null>(null);
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
  const [bgSolidColor, setBgSolidColor] = useState("#ffffff");
  const [bgGradientStart, setBgGradientStart] = useState("#ff6b6b");
  const [bgGradientEnd, setBgGradientEnd] = useState("#4ecdc4");
  const [lipstickColor, setLipstickColor] = useState("#e74c3c");
  const [blushColor, setBlushColor] = useState("#f8a5c2");
  const [eyeshadowColor, setEyeshadowColor] = useState("#a29bfe");
  const [localBrushActive, setLocalBrushActive] = useState(false);
  const [localBrushTool, setLocalBrushTool] = useState<"local_bright" | "local_warm" | "local_sat">("local_bright");
  const [colorSplashHue, setColorSplashHue] = useState(0);
  const [colorSplashRange, setColorSplashRange] = useState(30);
  const [doubleExposureImage, setDoubleExposureImage] = useState<HTMLImageElement | null>(null);
  const [blendMode, setBlendMode] = useState<"overlay" | "screen" | "soft-light">("overlay");
  const [doubleExposureOpacity, setDoubleExposureOpacity] = useState(50);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => { modelsReadyRef.current = modelsReady; }, [modelsReady]);
  useEffect(() => { modelErrorRef.current = modelError; }, [modelError]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => {
    if (imageLoadError) recoveryRef.current?.focus({ preventScroll: true });
  }, [imageLoadError]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return {
    canvasRef, originalRef, landmarksRef, historyRef, historyIdxRef, rafRef, blemishCanvasRef, faceApiRef,
    originalSizeRef, sourceFileRef, uploadRef, modelsReadyRef, modelErrorRef, faceModelsPromiseRef, recoveryRef,
    mountedRef, initialFileLoadedRef, imageLoadRequestRef, modelLoadRequestRef, draggingRef, localBrushMaskRef,
    localBrushCanvasRef, loading, setLoading, imageLoadError, setImageLoadError, loadProgress, setLoadProgress,
    detecting, setDetecting, cat, setCat, tool, setTool, settings, setSettings, faceOk, setFaceOk, faceError,
    setFaceError, modelsReady, setModelsReady, modelLoading, setModelLoading, modelError, setModelError,
    modelLoadIssue, setModelLoadIssue, showCompare, setShowCompare, holdingOriginal, setHoldingOriginal,
    comparePos, setComparePos, historyIdx, setHistoryIdx, showExport, setShowExport, exportQuality, setExportQuality,
    exportFormat, setExportFormat, compareDrag, setCompareDrag, showMesh, setShowMesh, modelLoadAttempt,
    setModelLoadAttempt, activeWorkflowGroup, setActiveWorkflowGroup, exportStatus, setExportStatus,
    projectSourceVersion, setProjectSourceVersion, projectStatus, setProjectStatus, recoverableProject,
    setRecoverableProject, frameId, setFrameId, texts, setTexts, stickers, setStickers, showTextPanel,
    setShowTextPanel, showStickerPanel, setShowStickerPanel, showFramePanel, setShowFramePanel, newText,
    setNewText, newTextColor, setNewTextColor, blemishMode, setBlemishMode, brushSize, setBrushSize,
    selectedOverlay, setSelectedOverlay, bgSolidColor, setBgSolidColor, bgGradientStart, setBgGradientStart,
    bgGradientEnd, setBgGradientEnd, lipstickColor, setLipstickColor, blushColor, setBlushColor,
    eyeshadowColor, setEyeshadowColor, localBrushActive, setLocalBrushActive, localBrushTool, setLocalBrushTool,
    colorSplashHue, setColorSplashHue, colorSplashRange, setColorSplashRange, doubleExposureImage,
    setDoubleExposureImage, blendMode, setBlendMode, doubleExposureOpacity, setDoubleExposureOpacity,
    isDragOver, setIsDragOver,
  };
}

export type EditorState = ReturnType<typeof useEditorState>;
