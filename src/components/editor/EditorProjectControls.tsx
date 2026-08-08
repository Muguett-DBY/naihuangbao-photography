import { FileDown, FolderOpen, Save } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

type EditorProjectControlsProps = {
  status: "idle" | "saving" | "saved" | "failed";
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

export function EditorProjectControls({ status, onSave, onExport, onImport }: EditorProjectControlsProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="editor-project-controls" role="group" aria-label={t("editor.project.controls")}>
      <button type="button" onClick={onSave} title={t("editor.project.save")} aria-label={t("editor.project.save")}>
        <Save size={17} aria-hidden="true" />
      </button>
      <button type="button" onClick={onExport} title={t("editor.project.export")} aria-label={t("editor.project.export")}>
        <FileDown size={17} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => inputRef.current?.click()} title={t("editor.project.import")} aria-label={t("editor.project.import")}>
        <FolderOpen size={17} aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".nhb,application/json,application/x-nhb-project+json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.target.value = "";
        }}
      />
      <span className={`editor-project-status is-${status}`} role="status" aria-live="polite">
        {status === "saving" ? t("editor.project.saving") : status === "saved" ? t("editor.project.saved") : status === "failed" ? t("editor.project.failed") : ""}
      </span>
    </div>
  );
}
