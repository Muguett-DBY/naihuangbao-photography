import { CircleCheck, Columns2, Download, Frame, Redo2, RotateCcw, ScanFace, Sparkles, Type, Undo2, Upload, WandSparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EditorExportDialog } from "../../components/editor/EditorExportDialog";
import { EditorHistoryRail } from "../../components/editor/EditorHistoryRail";
import { EditorHoldOriginalButton } from "../../components/editor/EditorHoldOriginalButton";
import { EditorProjectControls } from "../../components/editor/EditorProjectControls";
import { FRAMES, STICKERS } from "../../data/editor-constants";
import { EDITOR_WORKFLOW_GROUPS } from "../../data/editor-workflow";
import type { FrameId } from "../../types/photo-editor";
import { EditorCanvasStage } from "./EditorCanvasStage";
import type { EditorActions } from "./useEditorActions";
import type { EditorImageEngine } from "./useEditorImageEngine";
import type { EditorProjectLifecycle } from "./useEditorProjectLifecycle";
import type { EditorState } from "./useEditorState";

type PhotoEditorWorkspaceViewProps = {
  state: EditorState;
  engine: EditorImageEngine;
  actions: EditorActions;
  project: EditorProjectLifecycle;
};

export function PhotoEditorWorkspaceView({ state, engine, actions, project }: PhotoEditorWorkspaceViewProps) {
  const { t } = useTranslation();
  const hasImage = Boolean(state.originalRef.current);
  const activeWorkflow = EDITOR_WORKFLOW_GROUPS.find((group) => group.key === state.activeWorkflowGroup) ?? EDITOR_WORKFLOW_GROUPS[0];
  const restoreProject = () => {
    if (state.recoverableProject) project.restoreProject(state.recoverableProject);
  };

  return (
    <div
      className={`editor-root ${state.isDragOver ? "editor-drag-over" : ""}`}
      onMouseMove={actions.onCompareMove}
      onMouseUp={() => state.setCompareDrag(false)}
      onTouchMove={actions.onCompareMove}
      onTouchEnd={() => state.setCompareDrag(false)}
      onDragOver={actions.handleDragOver}
      onDragLeave={actions.handleDragLeave}
      onDrop={actions.handleDrop}
    >
      <header className="editor-header">
        <div><span className="editor-header-kicker">LOCAL STUDIO / WORKING FILE</span><h1>{t("editor.title")}</h1><p>{t("editor.subtitle")}</p></div>
        {state.modelLoading && !state.modelsReady && !state.modelError && <div className="editor-loading-models"><div className="editor-loading-bar"><div className="editor-loading-bar-fill" style={{ width: `${Math.max(state.loadProgress, 5)}%` }} /></div><span>{t(state.modelLoadAttempt > 1 ? "editor.modelRetrying" : "editor.loadingModels")}{state.loadProgress > 0 ? ` ${Math.round(state.loadProgress)}%` : ""}</span></div>}
        {state.modelError && <div className="editor-model-fallback" role="alert"><strong>{t(state.modelLoadIssue === "timeout" ? "editor.modelLoadTimedOut" : "editor.modelLoadFailed")}</strong><span>{t("editor.degradedMode")}</span><button type="button" className="editor-model-retry" onClick={engine.retryModels}>{t("editor.retryModels")}</button></div>}
      </header>

      <div className="editor-toolbar" aria-label={t("editor.toolbarPrimary")}>
        <div className="editor-toolbar-group editor-toolbar-group--primary"><button type="button" className="editor-btn editor-btn--primary" onClick={engine.handleUploadClick} aria-label={t("editor.upload")} title={t("editor.upload")}><Upload size={17} aria-hidden="true" /><span>{t("editor.upload")}</span></button></div>
        <input ref={state.uploadRef} type="file" accept="image/*" onChange={engine.handleFileChange} style={{ display: "none" }} />
        {hasImage && (
          <>
            <EditorProjectControls status={state.projectStatus} onSave={() => void project.persistProject()} onExport={() => void project.exportProject()} onImport={(file) => void project.importProject(file)} />
            <div className="editor-toolbar-group" role="group" aria-label={t("editor.toolbarHistory")}><button type="button" className="editor-icon-btn" disabled={state.historyIdx <= 0} onClick={engine.undo} aria-label={t("editor.undo")} title={t("editor.undo")}><Undo2 size={17} aria-hidden="true" /></button><button type="button" className="editor-icon-btn" disabled={state.historyIdx >= state.historyRef.current.length - 1} onClick={engine.redo} aria-label={t("editor.redo")} title={t("editor.redo")}><Redo2 size={17} aria-hidden="true" /></button><button type="button" className="editor-icon-btn" onClick={actions.handleAutoEnhance} aria-label={t("editor.auto")} title={t("editor.auto")}><WandSparkles size={17} aria-hidden="true" /></button></div>
            <div className="editor-toolbar-group" role="group" aria-label={t("editor.toolbarInspect")}><button type="button" className={`editor-icon-btn ${state.showMesh ? "active" : ""}`} onClick={() => state.setShowMesh(!state.showMesh)} aria-pressed={state.showMesh} aria-label={t("editor.faceMesh")} title={t("editor.faceMesh")}><ScanFace size={17} aria-hidden="true" /></button><button type="button" className={`editor-icon-btn ${state.showCompare ? "active" : ""}`} onClick={() => state.setShowCompare(!state.showCompare)} aria-pressed={state.showCompare} aria-label={t("editor.compare")} title={t("editor.compare")}><Columns2 size={17} aria-hidden="true" /></button><EditorHoldOriginalButton active={state.holdingOriginal} label={t("editor.holdOriginal", "Hold for original")} onChange={state.setHoldingOriginal} /></div>
            <div className="editor-toolbar-group" role="group" aria-label={t("editor.toolbarCompose")}><button type="button" className="editor-icon-btn" onClick={() => { state.setActiveWorkflowGroup("compose"); state.setShowTextPanel(!state.showTextPanel); }} aria-label={t("editor.addText")} title={t("editor.addText")}><Type size={17} aria-hidden="true" /></button><button type="button" className="editor-icon-btn" onClick={() => { state.setActiveWorkflowGroup("compose"); state.setShowStickerPanel(!state.showStickerPanel); }} aria-label={t("editor.uploadOverlay")} title={t("editor.uploadOverlay")}><Sparkles size={17} aria-hidden="true" /></button><button type="button" className="editor-icon-btn" onClick={() => { state.setActiveWorkflowGroup("compose"); state.setShowFramePanel(!state.showFramePanel); }} aria-label={t("editor.frame.none")} title={t("editor.frame.none")}><Frame size={17} aria-hidden="true" /></button></div>
            <div className="editor-toolbar-group" role="group" aria-label={t("editor.toolbarOutput")}><button type="button" className="editor-icon-btn" onClick={actions.handleReset} aria-label={t("editor.reset")} title={t("editor.reset")}><RotateCcw size={17} aria-hidden="true" /></button><button type="button" className="editor-icon-btn editor-icon-btn--primary" onClick={() => { state.setActiveWorkflowGroup("export"); state.setShowExport(true); }} aria-label={t("editor.export")} title={t("editor.export")}><Download size={17} aria-hidden="true" /></button></div>
          </>
        )}
        {state.detecting && <span className="editor-detecting" aria-live="polite">{t("editor.detecting")}</span>}
        {state.faceOk && <span className="editor-face-ok" role="status" aria-label={t("editor.faceDetected")}><CircleCheck size={17} aria-hidden="true" /></span>}
        {state.faceError && !state.detecting && <span className="editor-status-warning" role="status" aria-live="polite">{t("editor.noFaceDetected")}</span>}
      </div>

      {hasImage && (
        <section className="editor-workflow" aria-label={t("editor.workflow.label")}>
          <div className="editor-workflow-tabs" role="tablist" aria-label={t("editor.workflow.label")}>
            {EDITOR_WORKFLOW_GROUPS.map((group) => { const WorkflowIcon = group.icon; return <button key={group.key} type="button" role="tab" className={`editor-workflow-tab ${state.activeWorkflowGroup === group.key ? "active" : ""}`} aria-selected={state.activeWorkflowGroup === group.key} onClick={() => actions.handleWorkflowSelect(group.key)}><WorkflowIcon size={16} aria-hidden="true" /><span>{t(group.labelKey as never)}</span></button>; })}
          </div>
          <div className="editor-workflow-panel" role="tabpanel">
            <div><strong>{t(activeWorkflow.labelKey as never)}</strong><span>{t(activeWorkflow.descKey as never)}</span></div>
            {state.activeWorkflowGroup === "quick" && <button type="button" className="editor-workflow-action" onClick={actions.handleAutoEnhance}><WandSparkles size={16} aria-hidden="true" />{t("editor.auto")}</button>}
            {state.activeWorkflowGroup === "compose" && <div className="editor-workflow-actions"><button type="button" className="editor-workflow-action" onClick={() => state.setShowTextPanel(!state.showTextPanel)}>{t("editor.addText")}</button><button type="button" className="editor-workflow-action" onClick={() => state.setShowStickerPanel(!state.showStickerPanel)}>{t("editor.uploadOverlay")}</button><button type="button" className="editor-workflow-action" onClick={() => state.setShowFramePanel(!state.showFramePanel)}>{t("editor.frame.none")}</button></div>}
            {state.activeWorkflowGroup === "export" && <div className="editor-workflow-actions"><button type="button" className="editor-workflow-action" onClick={() => state.setShowCompare(!state.showCompare)}>{t("editor.compare")}</button><button type="button" className="editor-workflow-action editor-workflow-action--primary" onClick={() => state.setShowExport(true)}>{t("editor.export")}</button></div>}
          </div>
          {state.exportStatus.state !== "idle" && <div className={`editor-export-status editor-export-status--${state.exportStatus.state}`} role={state.exportStatus.state === "failed" ? "alert" : "status"} aria-live="polite"><span>{t(state.exportStatus.messageKey as never)}</span>{state.exportStatus.state === "failed" && <button type="button" onClick={() => state.setShowExport(true)}>{t("editor.exportStatus.retry")}</button>}</div>}
        </section>
      )}
      {hasImage && <EditorHistoryRail current={state.historyIdx} total={state.historyRef.current.length} onSelect={engine.jumpToHistory} />}

      {state.showTextPanel && <div className="editor-popup-panel"><input type="text" value={state.newText} onChange={(event) => state.setNewText(event.target.value)} placeholder={t("editor.textPlaceholder")} className="editor-text-input" /><input type="color" value={state.newTextColor} onChange={(event) => state.setNewTextColor(event.target.value)} className="editor-color-input" /><button type="button" className="editor-btn editor-btn--primary" onClick={actions.addText}>{t("editor.addText")}</button></div>}
      {state.showStickerPanel && <div className="editor-popup-panel editor-sticker-panel">{STICKERS.map((sticker) => <button key={sticker} type="button" className="editor-sticker-btn" onClick={() => actions.addSticker(sticker)}>{sticker}</button>)}</div>}
      {state.showFramePanel && <div className="editor-popup-panel editor-frame-panel">{FRAMES.map((frame) => <button key={frame.id} type="button" className={`editor-frame-btn ${state.frameId === frame.id ? "active" : ""}`} onClick={() => state.setFrameId(frame.id as FrameId)}>{t(frame.labelKey as never)}</button>)}</div>}
      <EditorContextControls state={state} engine={engine} actions={actions} />
      <EditorCanvasStage state={state} engine={engine} actions={actions} restoreProject={restoreProject} />
      <EditorExportDialog open={state.showExport} format={state.exportFormat} quality={state.exportQuality} onFormatChange={state.setExportFormat} onQualityChange={state.setExportQuality} onClose={() => state.setShowExport(false)} onDownload={() => void actions.handleDownload()} />
    </div>
  );
}

function EditorContextControls({ state, engine, actions }: Pick<PhotoEditorWorkspaceViewProps, "state" | "engine" | "actions">) {
  const { t } = useTranslation();
  const colorControl = (label: string, value: string, onChange: (value: string) => void) => <><label className="editor-label">{label}</label><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="editor-color-input" /></>;
  if (state.tool === "bg_solid" && state.cat === "bg") return <div className="editor-popup-panel">{colorControl(t("editor.bgColor"), state.bgSolidColor, state.setBgSolidColor)}</div>;
  if (state.tool === "bg_gradient" && state.cat === "bg") return <div className="editor-popup-panel">{colorControl(t("editor.gradientStart"), state.bgGradientStart, state.setBgGradientStart)}{colorControl(t("editor.gradientEnd"), state.bgGradientEnd, state.setBgGradientEnd)}</div>;
  if (state.tool === "lipstick" && state.cat === "makeup") return <div className="editor-popup-panel">{colorControl(t("editor.lipColor"), state.lipstickColor, state.setLipstickColor)}</div>;
  if (state.tool === "blush" && state.cat === "makeup") return <div className="editor-popup-panel">{colorControl(t("editor.blushColor"), state.blushColor, state.setBlushColor)}</div>;
  if (state.tool === "eyeshadow" && state.cat === "makeup") return <div className="editor-popup-panel">{colorControl(t("editor.eyeshadowColor"), state.eyeshadowColor, state.setEyeshadowColor)}</div>;
  if (state.cat === "tools" && ["local_bright", "local_warm", "local_sat"].includes(state.tool)) return <div className="editor-popup-panel editor-brush-controls"><button type="button" className={`editor-btn ${state.localBrushActive ? "active" : ""}`} onClick={() => { state.setLocalBrushActive(!state.localBrushActive); state.setLocalBrushTool(state.tool as typeof state.localBrushTool); }}>{state.localBrushActive ? t("editor.brushStop") : t("editor.brushStart")}</button><button type="button" className="editor-btn" onClick={actions.clearBrushMask}>{t("editor.brushClear")}</button></div>;
  if (state.tool === "color_splash" && state.cat === "tools") return <div className="editor-popup-panel editor-color-splash-controls"><label className="editor-label">{t("editor.targetHue")}: {state.colorSplashHue}°</label><input type="range" min="0" max="360" value={state.colorSplashHue} onChange={(event) => state.setColorSplashHue(Number(event.target.value))} className="editor-slider" /><label className="editor-label">{t("editor.hueRange")}: {state.colorSplashRange}°</label><input type="range" min="10" max="120" value={state.colorSplashRange} onChange={(event) => state.setColorSplashRange(Number(event.target.value))} className="editor-slider" /></div>;
  if (state.tool === "double_exposure" && state.cat === "tools") return <div className="editor-popup-panel editor-double-exposure-controls"><button type="button" className="editor-btn" onClick={actions.handleDoubleExposureUpload}>{state.doubleExposureImage ? t("editor.changeImage") : t("editor.uploadOverlay")}</button><select value={state.blendMode} onChange={(event) => state.setBlendMode(event.target.value as typeof state.blendMode)} className="editor-select"><option value="overlay">{t("editor.blendOverlay")}</option><option value="screen">{t("editor.blendScreen")}</option><option value="soft-light">{t("editor.blendSoftLight")}</option></select><label className="editor-label">{t("editor.opacity")}: {state.doubleExposureOpacity}%</label><input type="range" min="0" max="100" value={state.doubleExposureOpacity} onChange={(event) => state.setDoubleExposureOpacity(Number(event.target.value))} className="editor-slider" /></div>;
  return null;
}
