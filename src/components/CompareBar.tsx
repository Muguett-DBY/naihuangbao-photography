import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, GitCompare, X } from "lucide-react";
import { useCompare } from "../hooks/useCompare";
import { ImageWithFallback } from "./ImageWithFallback";

const relatedThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

export function CompareBar() {
  const { t } = useTranslation();
  const { entries, clear } = useCompare();
  if (entries.length === 0) return null;

  return (
    <aside className="compare-bar" role="region" aria-label={t("photoCompare.title", "Compare photos")}>
      <div className="compare-bar-head">
        <span className="compare-bar-title">
          <GitCompare size={16} />
          {t("photoCompare.title", "Compare photos")} ({entries.length}/2)
        </span>
        <div className="compare-bar-actions">
          <Link
            to="/compare"
            className="compare-bar-cta"
            aria-disabled={entries.length < 2}
          >
            {t("photoCompare.open", "Compare now")}
            <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            className="compare-bar-clear"
            onClick={clear}
            aria-label={t("photoCompare.clear", "Clear compare")}
          >
            <X size={14} />
            {t("photoCompare.clear", "Clear")}
          </button>
        </div>
      </div>
      <ul className="compare-bar-list">
        {entries.map((entry) => (
          <li key={entry.id} className="compare-bar-item">
            {entry.imageUrl ? (
              <ImageWithFallback
                src={relatedThumb(entry.imageUrl)}
                alt={entry.title ?? entry.id}
                title={entry.title ?? entry.id}
                tone="cream"
                sizes="80px"
              />
            ) : null}
            <span className="compare-bar-name">{entry.title ?? entry.id}</span>
          </li>
        ))}
        {entries.length < 2 && (
          <li className="compare-bar-placeholder">
            {t("photoCompare.hint", "Add one more photo to start comparing")}
          </li>
        )}
      </ul>
    </aside>
  );
}
