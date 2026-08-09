import { useTranslation } from "react-i18next";

export function RouteLoadingState() {
  const { t } = useTranslation();

  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-index">{t("loading")}</span>
      <span className="route-loading-rule" aria-hidden="true" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
