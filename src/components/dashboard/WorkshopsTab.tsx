import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import { StatusBadge } from "./StatusBadge";
import type { Workshop } from "../../types/dashboard";

export function WorkshopsTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ workshops: Workshop[] }>("/api/user/workshops");

  const workshops = data?.workshops ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={workshops.length === 0}
      emptyIcon={<MapPin size={40} strokeWidth={1.2} />}
      emptyText={t("dashboard.noWorkshops")}
      retry={retry}
    >
      <div className="dashboard-list">
        {workshops.map((w) => (
          <div key={w.id} className="dashboard-card">
            <div className="dashboard-card-header">
              <h4>{w.title}</h4>
              <StatusBadge status={w.status} />
            </div>
            <div className="dashboard-card-meta">
              {w.event_date && <span>{w.event_date}</span>}
              {w.location && <span>{w.location}</span>}
            </div>
            <p className="dashboard-card-date">
              {new Date(w.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </DashboardTabWrapper>
  );
}
