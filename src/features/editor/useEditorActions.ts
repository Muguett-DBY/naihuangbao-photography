import { useCallback } from "react";
import { INITIAL, TOOLS } from "../../data/editor-constants";
import { EDITOR_WORKFLOW_GROUPS, type EditorWorkflowKey } from "../../data/editor-workflow";
import { analyzeFaceAndCalcParams } from "../../lib/editor-utils";
import type { BeautySettings } from "../../types/photo-editor";
import type { EditorImageEngine } from "./useEditorImageEngine";
import type { EditorState } from "./useEditorState";

export function useEditorActions(state: EditorState, engine: EditorImageEngine) {
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    state.setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    state.setIsDragOver(false);
  }, []);
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    state.setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) engine.loadImageFile(file);
  }, [engine.loadImageFile]);

  const handleBrushPaint = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = state.canvasRef.current;
    if (!state.localBrushActive || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    if (!state.localBrushCanvasRef.current) {
      state.localBrushCanvasRef.current = document.createElement("canvas");
      state.localBrushCanvasRef.current.width = canvas.width;
      state.localBrushCanvasRef.current.height = canvas.height;
    }
    const context = state.localBrushCanvasRef.current.getContext("2d");
    if (!context) return;
    context.fillStyle = "rgba(255,255,255,0.8)";
    context.beginPath();
    context.arc(x, y, state.brushSize, 0, Math.PI * 2);
    context.fill();
    state.localBrushMaskRef.current = context.getImageData(0, 0, canvas.width, canvas.height);
    engine.render(state.settings);
  }, [engine.render, state.brushSize, state.localBrushActive, state.settings]);

  const clearBrushMask = useCallback(() => {
    state.localBrushCanvasRef.current = null;
    state.localBrushMaskRef.current = null;
    engine.render(state.settings);
  }, [engine.render, state.settings]);

  const handleDoubleExposureUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const image = new Image();
        image.onload = () => {
          state.setDoubleExposureImage(image);
          engine.render(state.settings);
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [engine.render, state.settings]);

  const handleSlider = useCallback((value: number) => {
    state.setSettings((current) => {
      const next = { ...current, [state.tool]: value };
      engine.render(next);
      return next;
    });
  }, [engine.render, state.tool]);
  const commitHistory = useCallback(() => state.setSettings((current) => {
    engine.pushHistory(current);
    return current;
  }), [engine.pushHistory]);
  const applyPreset = useCallback((preset: Partial<BeautySettings>) => {
    const next = { ...INITIAL, ...preset } as BeautySettings;
    state.setSettings(next);
    engine.render(next);
    engine.pushHistory(next);
  }, [engine.pushHistory, engine.render]);
  const handleAutoEnhance = useCallback(() => {
    const canvas = state.canvasRef.current;
    const landmarks = state.landmarksRef.current;
    const next = canvas && landmarks ? analyzeFaceAndCalcParams(canvas, landmarks) : { ...INITIAL, smooth: 50, slim: 15, bigeye: 10, whiten: 20, sharpen: 10 };
    state.setSettings(next);
    engine.render(next);
    engine.pushHistory(next);
  }, [engine.pushHistory, engine.render]);

  const handleDownload = useCallback(async () => {
    const canvas = state.canvasRef.current;
    if (!canvas) {
      state.setExportStatus({ state: "failed", messageKey: "editor.exportStatus.failed" });
      return;
    }
    state.setExportStatus({ state: "exporting", messageKey: "editor.exportStatus.exporting" });
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Canvas export returned no image data")), `image/${state.exportFormat}`, state.exportQuality / 100));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `beautified.${state.exportFormat}`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      state.setExportStatus({ state: "ready", messageKey: "editor.exportStatus.ready" });
      state.setShowExport(false);
    } catch {
      state.setExportStatus({ state: "failed", messageKey: "editor.exportStatus.failed" });
    }
  }, [state.exportFormat, state.exportQuality]);

  const handleReset = useCallback(() => {
    state.setSettings({ ...INITIAL });
    engine.render(INITIAL);
    engine.pushHistory(INITIAL);
    state.setTexts([]);
    state.setStickers([]);
    state.setFrameId("none");
    state.blemishCanvasRef.current = null;
  }, [engine.pushHistory, engine.render]);

  const addText = useCallback(() => {
    const canvas = state.canvasRef.current;
    if (!state.newText || !canvas) return;
    state.setTexts((current) => [...current, { id: `t${Date.now()}`, text: state.newText, x: canvas.width / 2, y: canvas.height / 2, size: 48, color: state.newTextColor }]);
    state.setNewText("");
    state.setShowTextPanel(false);
    engine.render(state.settings);
  }, [engine.render, state.newText, state.newTextColor, state.settings]);
  const addSticker = useCallback((emoji: string) => {
    const canvas = state.canvasRef.current;
    if (!canvas) return;
    state.setStickers((current) => [...current, { id: `s${Date.now()}`, emoji, x: canvas.width / 2, y: canvas.height / 2, size: 64 }]);
    engine.render(state.settings);
  }, [engine.render, state.settings]);
  const deleteOverlay = useCallback((id: string) => {
    state.setTexts((current) => current.filter((entry) => entry.id !== id));
    state.setStickers((current) => current.filter((entry) => entry.id !== id));
    state.setSelectedOverlay(null);
    window.setTimeout(() => engine.render(state.settings), 0);
  }, [engine.render, state.settings]);

  const getOverlayAt = useCallback((rawX: number, rawY: number) => {
    const canvas = state.canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (rawX - rect.left) * canvas.width / rect.width;
    const y = (rawY - rect.top) * canvas.height / rect.height;
    for (const sticker of state.stickers) {
      if (Math.abs(x - sticker.x) < sticker.size / 2 + 10 && Math.abs(y - sticker.y) < sticker.size / 2 + 10) return sticker.id;
    }
    for (const text of state.texts) {
      const width = text.text.length * text.size * 0.5;
      if (x > text.x - width / 2 && x < text.x + width / 2 && y > text.y - text.size && y < text.y + 10) return text.id;
    }
    return null;
  }, [state.stickers, state.texts]);

  const onOverlayMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = state.canvasRef.current;
    if (!canvas) return;
    const id = getOverlayAt(event.clientX, event.clientY);
    if (!id) {
      state.setSelectedOverlay(null);
      return;
    }
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    const overlay = [...state.texts, ...state.stickers].find((entry) => entry.id === id);
    if (overlay) state.draggingRef.current = { id, offsetX: x - overlay.x, offsetY: y - overlay.y };
    state.setSelectedOverlay(id);
  }, [getOverlayAt, state.stickers, state.texts]);
  const onOverlayMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = state.canvasRef.current;
    const dragging = state.draggingRef.current;
    if (!canvas || !dragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width - dragging.offsetX;
    const y = (event.clientY - rect.top) * canvas.height / rect.height - dragging.offsetY;
    for (const text of state.texts) if (text.id === dragging.id) { text.x = x; text.y = y; }
    for (const sticker of state.stickers) if (sticker.id === dragging.id) { sticker.x = x; sticker.y = y; }
    engine.render(state.settings);
  }, [engine.render, state.settings, state.stickers, state.texts]);
  const onOverlayMouseUp = useCallback(() => {
    const dragging = state.draggingRef.current;
    if (dragging) {
      state.setTexts((current) => current.map((entry) => entry.id === dragging.id ? { ...entry } : entry));
      state.setStickers((current) => current.map((entry) => entry.id === dragging.id ? { ...entry } : entry));
    }
    state.draggingRef.current = null;
  }, []);
  const onOverlayContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const id = getOverlayAt(event.clientX, event.clientY);
    if (id) deleteOverlay(id);
  }, [deleteOverlay, getOverlayAt]);

  const onCompareMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = state.canvasRef.current;
    if (!state.compareDrag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    state.setComparePos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, [state.compareDrag]);
  const handleCompareKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2 };
    if (event.key in steps) {
      event.preventDefault();
      state.setComparePos((current) => Math.max(0, Math.min(100, current + steps[event.key])));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      state.setComparePos(event.key === "Home" ? 0 : 100);
    }
  }, []);

  const handleWorkflowSelect = useCallback((key: EditorWorkflowKey) => {
    const group = EDITOR_WORKFLOW_GROUPS.find((entry) => entry.key === key) ?? EDITOR_WORKFLOW_GROUPS[0];
    state.setActiveWorkflowGroup(group.key);
    const category = group.categories[0];
    if (category && !group.categories.includes(state.cat)) {
      state.setCat(category);
      if (TOOLS[category]?.length) state.setTool(TOOLS[category][0].key);
    }
  }, [state.cat]);

  return {
    handleDragOver, handleDragLeave, handleDrop, handleBrushPaint, clearBrushMask, handleDoubleExposureUpload,
    handleSlider, commitHistory, applyPreset, handleAutoEnhance, handleDownload, handleReset, addText, addSticker,
    deleteOverlay, onOverlayMouseDown, onOverlayMouseMove, onOverlayMouseUp, onOverlayContextMenu, onCompareMove,
    handleCompareKeyDown, handleWorkflowSelect,
  };
}

export type EditorActions = ReturnType<typeof useEditorActions>;
