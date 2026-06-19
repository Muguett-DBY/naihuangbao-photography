import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PanelHeader({
  title,
  onSave,
  saving,
}: {
  title: string;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="adm-panel-head">
      <h2>{title}</h2>
      <button className="adm-submit" type="button" onClick={onSave} disabled={saving}>
        <Save size={14} />
        {saving ? t("admin.header.saving", "保存中...") : t("admin.header.savePublish", "保存并发布")}
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

export const adminMutationHeaders = { "x-nhb-admin-action": "1" };
export const publicMutationHeaders = { "x-nhb-public-action": "1" };

export { isAbortError } from "./errors";

export type AdminTab = "photos" | "bookings" | "packages" | "services" | "faq" | "copy" | "stats" | "vitals" | "courses" | "presets" | "workshops" | "merchandise";
export type ToastType = "success" | "error" | "info";

export type EditForm = {
  title: string;
  style: string;
  location: string;
  featured: boolean;
  visibility: string;
};
