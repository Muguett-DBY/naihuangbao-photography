import { useTranslation } from "react-i18next";

type EditorHistoryRailProps = {
  current: number;
  total: number;
  onSelect: (index: number) => void;
};

export function EditorHistoryRail({ current, total, onSelect }: EditorHistoryRailProps) {
  const { t } = useTranslation();
  const label = t("editor.toolbarHistory");

  return (
    <nav className="editor-history-rail" aria-label={label}>
      <span className="editor-history-rail__label">{label}</span>
      <div className="editor-history-rail__track">
        {Array.from({ length: total }, (_, index) => (
          <button
            key={index}
            type="button"
            className={index === current ? "is-current" : ""}
            aria-current={index === current ? "step" : undefined}
            aria-label={`${label} ${index + 1}`}
            onClick={() => onSelect(index)}
          >
            <span />
          </button>
        ))}
      </div>
      <output>{String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</output>
    </nav>
  );
}
