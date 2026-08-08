import { AlertTriangle, Camera, ImagePlus, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";

type EditorEmptyStateProps = {
  dragOver: boolean;
  errorMessageKey: string | null;
  recoveryRef: RefObject<HTMLDivElement | null>;
  hasRecoverableProject: boolean;
  onUpload: () => void;
  onRestore: () => void;
};

export function EditorEmptyState({ dragOver, errorMessageKey, recoveryRef, hasRecoverableProject, onUpload, onRestore }: EditorEmptyStateProps) {
  const { t } = useTranslation();
  if (dragOver) {
    return <div className="editor-drop-zone"><span className="editor-drop-icon" aria-hidden="true"><Camera size={32} /></span><p>{t("editor.dropHere", "Drop your photo here")}</p></div>;
  }
  if (errorMessageKey) {
    return (
      <div className="editor-image-error editor-recovery-panel" role="alert" aria-live="assertive" tabIndex={-1} ref={recoveryRef}>
        <span className="editor-recovery-icon" aria-hidden="true"><AlertTriangle size={20} /></span><span className="editor-empty-kicker">{t("editor.imageLoadFailed")}</span>
        <h2>{t("editor.editorRecoveryTitle")}</h2><p>{t(errorMessageKey as never)}</p><p className="editor-recovery-hint">{t("editor.imageRecoveryHint")}</p>
        <button type="button" className="editor-empty-upload editor-recovery-action" onClick={onUpload}><ImagePlus size={18} aria-hidden="true" /><span>{t("editor.tryAnotherImage")}</span></button>
        <div className="editor-recovery-badges" aria-label={t("editor.supportedFormatsLabel")}><span><ShieldCheck size={14} aria-hidden="true" />{t("editor.supportedFormats")}</span><span><Zap size={14} aria-hidden="true" />{t("editor.manualFallback", "Filters, text, and export stay available")}</span></div>
      </div>
    );
  }
  return (
    <div className="editor-empty-panel">
      <span className="editor-empty-kicker">{t("editor.emptyKicker", "Local editing studio")}</span><h2>{t("editor.emptyTitle", "Open a portrait to start editing")}</h2>
      <p>{t("editor.emptyDesc", "The workspace stays light until a photo is added, then loads the face model only when needed.")}</p>
      {hasRecoverableProject ? <button type="button" className="editor-project-restore" onClick={onRestore}>{t("editor.project.restore")}</button> : null}
      <button type="button" className="editor-empty-upload" onClick={onUpload}><ImagePlus size={18} aria-hidden="true" /><span>{t("editor.upload")}</span></button>
      <div className="editor-empty-badges" aria-label={t("editor.emptyBadgesLabel", "Editor loading notes")}><span><ShieldCheck size={14} aria-hidden="true" />{t("editor.localOnly", "Your photo stays on this device")}</span><span><Sparkles size={14} aria-hidden="true" />{t("editor.modelsDeferred", "AI models load only after you add a photo.")}</span><span><Zap size={14} aria-hidden="true" />{t("editor.manualFallback", "Filters, text, and export stay available")}</span></div>
      <p className="editor-drop-hint">{t("editor.dropHint", "or drag and drop an image")}</p>
    </div>
  );
}
