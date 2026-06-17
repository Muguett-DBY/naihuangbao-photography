import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw } from "lucide-react";

type DashboardTabWrapperProps = {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyIcon?: ReactNode;
  emptyText?: string;
  retry?: () => void;
  children: ReactNode;
};

/**
 * Shared wrapper for Dashboard tabs that handles loading, error, and empty states.
 * Eliminates duplicated loading/error/empty patterns across 5+ tab components.
 */
export function DashboardTabWrapper({
  loading,
  error,
  empty,
  emptyIcon,
  emptyText,
  retry,
  children,
}: DashboardTabWrapperProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="dashboard-loading">{t("common.loading")}</div>;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <AlertCircle size={32} className="dashboard-error-icon" />
        <p>{t("common.loadError", "加载失败，请重试")}</p>
        {retry && (
          <button type="button" className="dashboard-error-retry" onClick={retry}>
            <RefreshCw size={14} />
            {t("common.retry", "重试")}
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="dashboard-empty">
        {emptyIcon}
        <p>{emptyText || t("common.noData", "暂无数据")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
