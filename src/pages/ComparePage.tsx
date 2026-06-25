import "../styles/pages.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GitCompare, Layers, Repeat, X } from "lucide-react";
import { useCompare } from "../hooks/useCompare";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { CompareSlider } from "../components/CompareSlider";
import { useState } from "react";

const fullSrc = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/1200/${fileName}` : src;
};

export function ComparePage() {
  const { t } = useTranslation();
  const { entries, clear, remove } = useCompare();
  const [viewMode, setViewMode] = useState<"side-by-side" | "overlay">("side-by-side");
  const [swapped, setSwapped] = useState(false);

  const photos = swapped ? [...entries].reverse() : entries;
  const hasBoth = entries.length === 2;

  return (
    <div className="compare-page">
      <header className="compare-page-header">
        <Link to="/gallery" className="compare-page-back">
          <ArrowLeft size={16} />
          {t("photoCompare.backToGallery", "Back to gallery")}
        </Link>
        <h1>
          <GitCompare size={22} />
          {t("photoCompare.title", "Compare photos")}
        </h1>
        <div className="compare-page-actions">
          {hasBoth && (
            <>
              <button
                type="button"
                className="compare-page-mode-btn"
                onClick={() => setViewMode(viewMode === "side-by-side" ? "overlay" : "side-by-side")}
                aria-label={t("photoCompare.toggleMode", "Toggle view mode")}
              >
                <Layers size={14} />
                {viewMode === "side-by-side" ? t("photoCompare.overlay", "Overlay") : t("photoCompare.sideBySide", "Side by side")}
              </button>
              <button
                type="button"
                className="compare-page-mode-btn"
                onClick={() => setSwapped(!swapped)}
                aria-label={t("photoCompare.swap", "Swap photos")}
              >
                <Repeat size={14} />
                {t("photoCompare.swap", "Swap")}
              </button>
            </>
          )}
          {entries.length > 0 && (
            <button type="button" className="compare-page-clear" onClick={clear}>
              <X size={14} /> {t("photoCompare.clear", "Clear all")}
            </button>
          )}
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="compare-page-empty">
          <p>{t("photoCompare.empty", "Add up to 2 photos to compare side by side.")}</p>
          <Link to="/gallery" className="compare-page-cta">
            {t("photoCompare.browseGallery", "Browse gallery")}
          </Link>
        </div>
      ) : entries.length === 1 ? (
        <div className="compare-page-hint">
          {t("photoCompare.needTwo", "Add one more photo to compare side by side.")}
        </div>
      ) : null}

      {hasBoth && viewMode === "overlay" ? (
        <div className="compare-page-overlay">
          <CompareSlider
            beforeSrc={fullSrc(photos[0].imageUrl ?? "")}
            afterSrc={fullSrc(photos[1].imageUrl ?? "")}
            beforeAlt={photos[0].title ?? photos[0].id}
            afterAlt={photos[1].title ?? photos[1].id}
          />
        </div>
      ) : (
        <div className="compare-page-grid">
          {photos.map((entry) => (
            <article key={entry.id} className="compare-page-card">
              <header className="compare-page-card-head">
                <Link to={entry.href} className="compare-page-card-title">
                  {entry.title ?? entry.id}
                </Link>
                <button
                  type="button"
                  className="compare-page-card-remove"
                  onClick={() => remove(entry.id)}
                  aria-label={t("photoCompare.removeOne", "Remove this photo from compare")}
                >
                  <X size={14} />
                </button>
              </header>
              <div className="compare-page-image-wrap">
                {entry.imageUrl ? (
                  <ImageWithFallback
                    src={fullSrc(entry.imageUrl)}
                    alt={entry.title ?? entry.id}
                    title={entry.title ?? entry.id}
                    tone="cream"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
