import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { ImageWithFallback } from "./ImageWithFallback";

const relatedThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

export function RecentlyViewedStrip({ currentId }: { currentId?: string }) {
  const { t } = useTranslation();
  const { entries, clear } = useRecentlyViewed();
  const filtered = currentId ? entries.filter((entry) => entry.id !== currentId) : entries;
  if (filtered.length === 0) return null;

  return (
    <section className="section-shell is-visible recently-viewed" aria-labelledby="recently-viewed-title">
      <div className="recently-viewed-head">
        <h2 id="recently-viewed-title">{t("recentlyViewed.title", "Recently viewed")}</h2>
        <button
          type="button"
          className="recently-viewed-clear"
          onClick={clear}
          aria-label={t("recentlyViewed.clear", "Clear recently viewed")}
        >
          <X size={14} />
          {t("recentlyViewed.clear", "Clear")}
        </button>
      </div>
      <ul className="recently-viewed-list" aria-label={t("recentlyViewed.title", "Recently viewed")}>
        {filtered.map((entry) => (
          <li key={entry.id} className="recently-viewed-item">
            <Link to={entry.href} className="recently-viewed-card">
              {entry.imageUrl ? (
                <ImageWithFallback
                  src={relatedThumb(entry.imageUrl)}
                  alt={entry.title ?? entry.id}
                  title={entry.title ?? entry.id}
                  tone="cream"
                  sizes="120px"
                />
              ) : null}
              <span className="recently-viewed-name">{entry.title ?? entry.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
