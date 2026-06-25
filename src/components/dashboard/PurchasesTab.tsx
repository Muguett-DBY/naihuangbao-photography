import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import type { Purchase } from "../../types/dashboard";

export function PurchasesTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ purchases: Purchase[] }>("/api/user/purchases");

  const purchases = data?.purchases ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={purchases.length === 0}
      emptyIcon={<ShoppingCart size={40} strokeWidth={1.2} />}
      emptyTitle={t("dashboard.emptyStates.purchases.title")}
      emptyText={t("dashboard.emptyStates.purchases.description")}
      emptyAction={{ href: "/shop", label: t("dashboard.emptyStates.purchases.action") }}
      retry={retry}
    >
      <div className="dashboard-list">
        {purchases.map((p) => (
          <div key={p.id} className="dashboard-card">
            <div className="dashboard-card-header">
              <h4>{p.item_name}</h4>
              <span className="dashboard-card-type">{p.item_type}</span>
            </div>
            <p className="dashboard-card-date">
              {new Date(p.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </DashboardTabWrapper>
  );
}
