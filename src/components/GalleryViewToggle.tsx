import { BookOpen, Columns, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";

export type GalleryViewMode = "masonry" | "compact" | "story";

const VIEW_OPTIONS = [
  { id: "masonry", icon: LayoutGrid, labelKey: "gallery.viewMasonry", fallback: "Masonry view" },
  { id: "compact", icon: Columns, labelKey: "gallery.viewCompact", fallback: "Compact view" },
  { id: "story", icon: BookOpen, labelKey: "gallery.viewStory", fallback: "Story view" },
] as const;

export function GalleryViewToggle({
  value,
  onChange,
}: {
  value: GalleryViewMode;
  onChange: (view: GalleryViewMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="gallery-view-toggle" role="group" aria-label={t("gallery.viewMode", "View mode")}>
      {VIEW_OPTIONS.map(({ id, icon: Icon, labelKey, fallback }) => (
        <button
          key={id}
          type="button"
          className={`gallery-view-btn ${value === id ? "is-active" : ""}`}
          onClick={() => onChange(id)}
          aria-label={t(labelKey, fallback)}
          aria-pressed={value === id}
          title={t(labelKey, fallback)}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
