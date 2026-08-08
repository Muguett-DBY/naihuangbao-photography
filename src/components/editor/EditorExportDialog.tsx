import { Download, Gauge, Printer, Smartphone, X } from "lucide-react";
import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../../hooks/useFocusTrap";

type EditorExportDialogProps = {
  open: boolean;
  format: "png" | "jpeg";
  quality: number;
  onFormatChange: (format: "png" | "jpeg") => void;
  onQualityChange: (quality: number) => void;
  onClose: () => void;
  onDownload: () => void;
};

export function EditorExportDialog({ open, format, quality, onFormatChange, onQualityChange, onClose, onDownload }: EditorExportDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useFocusTrap<HTMLDivElement>({ active: open, initialFocus: "first" });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="editor-modal-overlay" onMouseDown={onClose}>
      <div ref={dialogRef} className="editor-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <header className="editor-modal-heading">
          <h3 id={titleId}>{t("editor.exportTitle")}</h3>
          <button type="button" className="editor-modal-close" onClick={onClose} aria-label={t("editor.cancel")} title={t("editor.cancel")}><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="editor-export-presets">
          <button type="button" className={`editor-preset-btn ${format === "jpeg" && quality === 85 ? "active" : ""}`} onClick={() => { onFormatChange("jpeg"); onQualityChange(85); }}>
            <span className="editor-preset-icon"><Smartphone size={20} aria-hidden="true" /></span><span className="editor-preset-label">{t("editor.presetSocial", "Social")}</span><span className="editor-preset-desc">JPEG 85%</span>
          </button>
          <button type="button" className={`editor-preset-btn ${format === "jpeg" && quality === 75 ? "active" : ""}`} onClick={() => { onFormatChange("jpeg"); onQualityChange(75); }}>
            <span className="editor-preset-icon"><Gauge size={20} aria-hidden="true" /></span><span className="editor-preset-label">{t("editor.presetQuick", "Quick")}</span><span className="editor-preset-desc">JPEG 75%</span>
          </button>
          <button type="button" className={`editor-preset-btn ${format === "png" ? "active" : ""}`} onClick={() => { onFormatChange("png"); onQualityChange(100); }}>
            <span className="editor-preset-icon"><Printer size={20} aria-hidden="true" /></span><span className="editor-preset-label">{t("editor.presetPrint", "Print")}</span><span className="editor-preset-desc">PNG</span>
          </button>
        </div>
        <div className="editor-export-options">
          <label>{t("editor.format")}<select value={format} onChange={(event) => onFormatChange(event.target.value as "png" | "jpeg")}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label>
          <label>{t("editor.quality")}<input type="range" min="10" max="100" value={quality} onChange={(event) => onQualityChange(Number(event.target.value))} /><span>{quality}%</span></label>
        </div>
        <div className="editor-modal-actions">
          <button type="button" className="editor-btn" onClick={onClose}>{t("editor.cancel")}</button>
          <button type="button" className="editor-btn editor-btn--primary" onClick={onDownload}><Download size={16} aria-hidden="true" />{t("editor.download")}</button>
        </div>
      </div>
    </div>
  );
}
