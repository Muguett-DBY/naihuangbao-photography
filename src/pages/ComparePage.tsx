import "../styles/pages.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GitCompare, X } from "lucide-react";
import { useCompare } from "../hooks/useCompare";
import { ImageWithFallback } from "../components/ImageWithFallback";

const fullSrc = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/1200/${fileName}` : src;
};

export function ComparePage() {
  const { t } = useTranslation();
  const { entries, clear, remove } = useCompare();

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
        {entries.length > 0 && (
          <button type="button" className="compare-page-clear" onClick={clear}>
            <X size={14} /> {t("photoCompare.clear", "Clear all")}
          </button>
        )}
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

      <div className="compare-page-grid">
        {entries.map((entry) => (
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
    </div>
  );
}
