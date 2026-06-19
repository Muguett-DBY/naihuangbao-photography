import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import { ImageWithFallback } from "../ImageWithFallback";

const relatedThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

export function FavoritesTab() {
  const { t } = useTranslation();
  const { entries, clear, remove } = useFavorites();

  return (
    <DashboardTabWrapper
      loading={false}
      error={null}
      empty={entries.length === 0}
      emptyIcon={<Heart size={40} strokeWidth={1.2} />}
      emptyText={t("favorites.empty", "No favorites yet. Tap the heart on any photo to save it.")}
      retry={() => undefined}
    >
      <div className="dashboard-favorites-head">
        <p className="dashboard-favorites-count">
          {t("favorites.count", { count: entries.length, defaultValue: `${entries.length} saved photos` })}
        </p>
        {entries.length > 0 && (
          <button type="button" className="dashboard-favorites-clear" onClick={clear}>
            <Trash2 size={14} />
            {t("favorites.clearAll", "Clear all")}
          </button>
        )}
      </div>
      <ul className="dashboard-favorites-grid" aria-label={t("favorites.title", "Favorites")}>
        {entries.map((entry) => (
          <li key={entry.id} className="dashboard-favorites-item">
            <Link to={entry.href} className="dashboard-favorites-card">
              {entry.imageUrl ? (
                <ImageWithFallback
                  src={relatedThumb(entry.imageUrl)}
                  alt={entry.title ?? entry.id}
                  title={entry.title ?? entry.id}
                  tone="cream"
                  sizes="(max-width: 600px) 50vw, 240px"
                />
              ) : null}
              <span className="dashboard-favorites-name">{entry.title ?? entry.id}</span>
            </Link>
            <button
              type="button"
              className="dashboard-favorites-remove"
              onClick={() => remove(entry.id)}
              aria-label={t("favorites.remove", "Remove from favorites")}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </DashboardTabWrapper>
  );
}
