import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Loader2 } from "lucide-react";

type DataStateProps = {
  loading: boolean;
  error: string | null;
  empty: boolean;
  retry?: () => void;
  icon?: ReactNode;
  emptyText?: string;
  errorText?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function DataState({ loading, error, empty, retry, icon, emptyText, errorText, action, children }: DataStateProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="data-state data-state-loading" role="status" aria-live="polite" aria-busy="true">
        <span className="data-state-marker">LOADING / 00</span>
        <Loader2 size={28} className="data-state-spinner" aria-hidden="true" />
        <h2>{t("common.loading")}</h2>
        <p>{t("common.loadingHint")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-state data-state-error" role="alert">
        <span className="data-state-marker">CONNECTION / 01</span>
        <h2>{t("common.loadError")}</h2>
        <p>{errorText || t("common.loadErrorHint")}</p>
        <div className="data-state-actions">
          {retry && (
            <button type="button" className="data-state-retry" onClick={retry}>
              <RefreshCw size={16} aria-hidden="true" />
              {t("common.retry")}
            </button>
          )}
          {action}
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="data-state data-state-empty" role="status" aria-live="polite">
        <span className="data-state-marker">ARCHIVE / 00</span>
        {icon && <span className="data-state-icon" aria-hidden="true">{icon}</span>}
        <h2>{emptyText || t("common.noData")}</h2>
        <p>{t("common.emptyHint")}</p>
        <div className="data-state-actions">{action}</div>
      </div>
    );
  }

  return <>{children}</>;
}
