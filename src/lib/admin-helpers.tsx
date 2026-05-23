import { Save } from "lucide-react";

export function PanelHeader({
  title,
  onSave,
  saving,
}: {
  title: string;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="adm-panel-head">
      <h2>{title}</h2>
      <button className="adm-submit" type="button" onClick={onSave} disabled={saving}>
        <Save size={14} />
        {saving ? "保存中..." : "保存并发布"}
      </button>
    </div>
  );
}

export function linesFromText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export type AdminTab = "photos" | "packages" | "services" | "faq" | "copy";
export type ToastType = "success" | "error" | "info";

export type EditForm = {
  title: string;
  style: string;
  location: string;
  featured: boolean;
  visibility: string;
};
