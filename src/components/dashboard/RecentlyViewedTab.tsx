import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { History, Trash2 } from "lucide-react";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import { ImageWithFallback } from "../ImageWithFallback";

const relatedThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

export function RecentlyViewedTab() {
  const { t } = useTranslation();
  const { entries, clear } = useRecentlyViewed();

  return (
    <DashboardTabWrapper
      loading={false}
      error={null}
      empty={entries.length === 0}
      emptyIcon={<History size={40} strokeWidth={1.2} />}
      emptyTitle={t("dashboard.emptyStates.recent.title")}
      emptyText={t("dashboard.emptyStates.recent.description")}
      emptyAction={{ href: "/gallery", label: t("dashboard.emptyStates.recent.action") }}
      retry={() => undefined}
    >
      <div className="dashboard-favorites-head">
        <p className="dashboard-favorites-count">
          {t("recentlyViewed.tabCount", { count: entries.length, defaultValue: `${entries.length} recently viewed` })}
        </p>
        {entries.length > 0 && (
          <button type="button" className="dashboard-favorites-clear" onClick={clear}>
            <Trash2 size={14} />
            {t("recentlyViewed.clearAllTab", "Clear all")}
          </button>
        )}
      </div>
      <ul className="dashboard-favorites-grid" aria-label={t("recentlyViewed.title", "Recently viewed")}>
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
          </li>
        ))}
      </ul>
    </DashboardTabWrapper>
  );
}
