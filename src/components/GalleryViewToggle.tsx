import { BookOpen, Columns, Grid3X3, LayoutGrid, MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";

export type GalleryViewMode = "masonry" | "compact" | "contact" | "story" | "atlas";

const VIEW_OPTIONS = [
  { id: "masonry", icon: LayoutGrid, labelKey: "gallery.viewMasonry", fallback: "Masonry view" },
  { id: "compact", icon: Columns, labelKey: "gallery.viewCompact", fallback: "Compact view" },
  { id: "contact", icon: Grid3X3, labelKey: "gallery.viewContact", fallback: "Contact sheet" },
  { id: "story", icon: BookOpen, labelKey: "gallery.viewStory", fallback: "Story view" },
  { id: "atlas", icon: MapPinned, labelKey: "gallery.viewAtlas", fallback: "Exhibition atlas" },
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
