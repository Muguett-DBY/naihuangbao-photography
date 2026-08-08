import { useTranslation } from "react-i18next";
import { FILTERS } from "../../data/editor-constants";
import type { BeautySettings } from "../../types/photo-editor";

const PREVIEW_FILTERS = [
  "none",
  "brightness(1.07) saturate(0.9)",
  "contrast(1.08) saturate(0.82)",
  "sepia(0.28) contrast(0.96)",
  "contrast(1.14) saturate(0.76)",
  "brightness(1.08) saturate(0.72) hue-rotate(-8deg)",
  "contrast(1.08) saturate(1.12) sepia(0.12)",
  "grayscale(1) contrast(1.08)",
  "saturate(0.82) hue-rotate(12deg)",
  "brightness(1.04) saturate(1.08) sepia(0.16)",
  "contrast(1.28) saturate(0.9)",
  "brightness(1.08) saturate(0.84) blur(0.35px)",
] as const;

type EditorFilterPresetsProps = {
  source: string;
  onApply: (settings: Partial<BeautySettings>) => void;
};

export function EditorFilterPresets({ source, onApply }: EditorFilterPresetsProps) {
  const { t } = useTranslation();

  return (
    <div className="editor-filter-grid">
      {FILTERS.map((filter, index) => (
        <button key={filter.name} type="button" className="editor-filter-btn" onClick={() => onApply(filter.settings)}>
          <span className="editor-filter-preview" aria-hidden="true">
            <img
              src={source}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ filter: PREVIEW_FILTERS[index % PREVIEW_FILTERS.length] }}
            />
          </span>
          <span className="editor-filter-name">{t(filter.name as never)}</span>
        </button>
      ))}
    </div>
  );
}
