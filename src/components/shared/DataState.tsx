import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

type DataStateProps = {
  loading: boolean;
  error: string | null;
  empty: boolean;
  retry?: () => void;
  icon?: ReactNode;
  emptyText?: string;
  children: ReactNode;
};

/**
 * Shared component for displaying loading, error, and empty states.
 * Wraps content and shows appropriate state based on data fetching status.
 *
 * Usage:
 *   <DataState loading={loading} error={error} empty={empty} retry={retry} icon={<BookOpen />}>
 *     <div className="courses-grid">{courses.map(...)}</div>
 *   </DataState>
 */
export function DataState({ loading, error, empty, retry, icon, emptyText, children }: DataStateProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="data-state-loading">{t("common.loading")}</div>;
  }

  if (error) {
    return (
      <div className="data-state-error">
        <p>{t("common.loadError")}</p>
        {retry && (
          <button type="button" className="data-state-retry" onClick={retry}>
            <RefreshCw size={14} />
            {t("common.retry", "Retry")}
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="data-state-empty">
        {icon}
        <p>{emptyText || t("common.noData", "No data")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
