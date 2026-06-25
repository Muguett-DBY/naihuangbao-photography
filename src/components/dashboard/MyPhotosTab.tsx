import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Image, Download } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import type { UserPhoto } from "../../types/dashboard";

export function MyPhotosTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ photos: UserPhoto[] }>("/api/user/photos");

  const photos = data?.photos ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={photos.length === 0}
      emptyIcon={<Image size={40} strokeWidth={1.2} />}
      emptyTitle={t("dashboard.emptyStates.photos.title")}
      emptyText={t("dashboard.emptyStates.photos.description")}
      emptyAction={{ href: "/gallery", label: t("dashboard.emptyStates.photos.action") }}
      retry={retry}
    >
      <div className="dashboard-photo-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="dashboard-photo-card">
            <Link to={`/gallery/${photo.id}`} className="dashboard-photo-link">
              <div className="dashboard-photo-thumb">
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  loading="lazy"
                />
              </div>
              <div className="dashboard-photo-info">
                <h4>{photo.title}</h4>
                <span className="dashboard-photo-date">
                  {photo.delivered_at ? new Date(photo.delivered_at).toLocaleDateString() : ""}
                </span>
              </div>
            </Link>
            <div className="dashboard-photo-actions">
              <a
                href={photo.imageUrl}
                download
                className="dashboard-photo-download"
              >
                <Download size={12} />
                {t("dashboard.download")}
              </a>
            </div>
          </div>
        ))}
      </div>
    </DashboardTabWrapper>
  );
}
