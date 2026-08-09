import { SlidersHorizontal, Split } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EditorEmptyState } from "../../components/editor/EditorEmptyState";
import { EditorFilterPresets } from "../../components/editor/EditorFilterPresets";
import { CATEGORIES, CATEGORY_DESCRIPTIONS, TOOLS } from "../../data/editor-constants";
import { EDITOR_CATEGORY_ICONS, EDITOR_TOOL_ICONS, EDITOR_WORKFLOW_GROUPS } from "../../data/editor-workflow";
import type { EditorActions } from "./useEditorActions";
import type { EditorImageEngine } from "./useEditorImageEngine";
import { EDITOR_IMAGE_LOAD_ERROR_KEYS, type EditorState } from "./useEditorState";

type EditorCanvasStageProps = {
  state: EditorState;
  engine: EditorImageEngine;
  actions: EditorActions;
  restoreProject: () => void;
};

export function EditorCanvasStage({ state, engine, actions, restoreProject }: EditorCanvasStageProps) {
  const { t } = useTranslation();
  const workflow = EDITOR_WORKFLOW_GROUPS.find((group) => group.key === state.activeWorkflowGroup) ?? EDITOR_WORKFLOW_GROUPS[0];
  const workflowCategories = CATEGORIES.filter((category) => workflow.categories.includes(category.key));
  const currentTools = TOOLS[state.cat];
  const hasImage = Boolean(state.originalRef.current);
  const errorKey = state.imageLoadError ? EDITOR_IMAGE_LOAD_ERROR_KEYS[state.imageLoadError] : null;

  return (
    <div className="editor-workspace">
      <div className="editor-canvas-container">
        {!hasImage && !state.loading && (
          <div className={`editor-canvas--empty ${state.imageLoadError ? "editor-canvas--error" : ""}`}>
            <EditorEmptyState dragOver={state.isDragOver} errorMessageKey={errorKey} recoveryRef={state.recoveryRef} hasRecoverableProject={Boolean(state.recoverableProject)} onUpload={engine.handleUploadClick} onRestore={restoreProject} />
          </div>
        )}
        <canvas
          ref={state.canvasRef}
          className={`editor-canvas ${!hasImage ? "editor-canvas--placeholder" : ""}${state.holdingOriginal ? " is-holding-original" : ""}`}
          style={{
            ...(state.showCompare ? { clipPath: `inset(0 ${100 - state.comparePos}% 0 0)` } : undefined),
            ...(state.holdingOriginal ? { opacity: 0 } : undefined),
            ...(state.blemishMode || state.localBrushActive ? { cursor: "crosshair" } : undefined),
          }}
          onClick={state.blemishMode ? engine.handleCanvasClick : undefined}
          onMouseDown={state.localBrushActive ? actions.handleBrushPaint : actions.onOverlayMouseDown}
          onMouseMove={state.localBrushActive ? actions.handleBrushPaint : actions.onOverlayMouseMove}
          onMouseUp={actions.onOverlayMouseUp}
          onTouchStart={(event) => {
            if (state.blemishMode) engine.handleCanvasClick(event as never);
            else if (state.localBrushActive) actions.handleBrushPaint(event as never);
            else actions.onOverlayMouseDown(event as never);
          }}
          onTouchMove={(event) => state.localBrushActive ? actions.handleBrushPaint(event as never) : actions.onOverlayMouseMove(event as never)}
          onTouchEnd={actions.onOverlayMouseUp}
          onContextMenu={actions.onOverlayContextMenu}
          role="img"
          aria-label={t("editor.canvasLabel")}
        />
        {state.holdingOriginal && state.originalRef.current && <img className="editor-held-original" src={state.originalRef.current.src} alt={t("editor.before")} />}
        {!state.holdingOriginal && state.showCompare && state.originalRef.current && (
          <>
            <img src={state.originalRef.current.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", clipPath: `inset(0 0 0 ${state.comparePos}%)` }} />
            <div className="editor-compare-line" style={{ left: `${state.comparePos}%` }} onMouseDown={() => state.setCompareDrag(true)} onTouchStart={() => state.setCompareDrag(true)} onKeyDown={actions.handleCompareKeyDown} role="slider" tabIndex={0} aria-label={t("editor.comparePosition")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state.comparePos)} aria-valuetext={t("editor.comparePositionValue", { percent: Math.round(state.comparePos) })} aria-orientation="horizontal">
              <span className="editor-compare-label editor-compare-label--before">{t("editor.before")}</span>
              <span className="editor-compare-label editor-compare-label--after">{t("editor.after")}</span>
              <span className="editor-compare-grip" aria-hidden="true"><Split size={15} /></span>
            </div>
          </>
        )}
        {state.loading && <div className="editor-overlay">{t("editor.loadingImage")}</div>}
      </div>

      {hasImage && (
        <div className="editor-beauty-panel">
          {workflowCategories.length > 0 ? (
            <>
              <div className="editor-categories">
                {workflowCategories.map((category) => {
                  const CategoryIcon = EDITOR_CATEGORY_ICONS[category.key];
                  return <button key={category.key} type="button" className={`editor-cat-btn ${state.cat === category.key ? "active" : ""}`} aria-pressed={state.cat === category.key} onClick={() => { state.setCat(category.key); if (TOOLS[category.key]?.length) state.setTool(TOOLS[category.key][0].key); }}><CategoryIcon size={16} aria-hidden="true" /><span>{t(category.labelKey as never)}</span></button>;
                })}
              </div>
              <p className="editor-cat-desc">{t(CATEGORY_DESCRIPTIONS[state.cat] as never)}</p>
            </>
          ) : (
            <div className="editor-export-card"><strong>{t("editor.exportSummaryTitle")}</strong><span>{t("editor.exportSummaryDesc")}</span><button type="button" className="editor-btn editor-btn--primary" onClick={() => state.setShowExport(true)}>{t("editor.export")}</button></div>
          )}

          {workflowCategories.length === 0 ? null : state.cat === "filter" ? (
            <EditorFilterPresets source={state.originalRef.current?.src || ""} onApply={actions.applyPreset} />
          ) : (
            <>
              <div className="editor-tools">
                {currentTools?.map((item) => {
                  const ToolIcon = EDITOR_TOOL_ICONS[item.key] ?? SlidersHorizontal;
                  return <button key={item.key} type="button" className={`editor-tool-btn ${state.tool === item.key ? "active" : ""}`} aria-pressed={state.tool === item.key} onClick={() => { state.setTool(item.key); state.setBlemishMode(item.key === "blemish"); state.setLocalBrushActive(["local_bright", "local_warm", "local_sat"].includes(item.key)); state.setLocalBrushTool(item.key as typeof state.localBrushTool); }}><span className="editor-tool-icon"><ToolIcon size={16} aria-hidden="true" /></span><span className="editor-tool-label">{t(item.labelKey as never)}</span></button>;
                })}
              </div>
              {state.tool === "blemish" && <div className="editor-slider-group"><label>{t("editor.brushSize")}<span className="editor-slider-value">{state.brushSize}px</span></label><input type="range" min="5" max="50" value={state.brushSize} onChange={(event) => state.setBrushSize(Number(event.target.value))} className="editor-slider" /></div>}
              {state.tool !== "blemish" && currentTools?.some((item) => item.key === state.tool) && <div className="editor-slider-group"><label>{t(currentTools.find((item) => item.key === state.tool)?.labelKey as never)}<span className="editor-slider-value">{state.settings[state.tool]}%</span></label><input type="range" min="-100" max="100" value={state.settings[state.tool]} onChange={(event) => actions.handleSlider(Number(event.target.value))} onMouseUp={actions.commitHistory} onTouchEnd={actions.commitHistory} className="editor-slider" /></div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
