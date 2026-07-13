import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

type DashboardTabWrapperProps = {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: {
    href: string;
    label: string;
  };
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
  emptyTitle,
  emptyText,
  emptyAction,
  retry,
  children,
}: DashboardTabWrapperProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="dashboard-loading" role="status" aria-label={t("common.loading")}>
        <span className="dashboard-loading-line dashboard-loading-line--wide" />
        <span className="dashboard-loading-line" />
        <span className="dashboard-loading-line dashboard-loading-line--short" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error" role="alert">
        <AlertCircle size={32} className="dashboard-error-icon" aria-hidden="true" />
        <p>{t("common.loadError", "加载失败，请重试")}</p>
        {retry && (
          <button type="button" className="dashboard-error-retry" onClick={retry}>
            <RefreshCw size={14} aria-hidden="true" />
            {t("common.retry", "重试")}
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="dashboard-empty">
        <span className="dashboard-empty-icon" aria-hidden="true">{emptyIcon}</span>
        <div className="dashboard-empty-copy">
          <h3>{emptyTitle || t("common.noData", "暂无数据")}</h3>
          <p>{emptyText || t("common.noData", "暂无数据")}</p>
        </div>
        {emptyAction && (
          <Link to={emptyAction.href} className="dashboard-empty-action">
            {emptyAction.label}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
