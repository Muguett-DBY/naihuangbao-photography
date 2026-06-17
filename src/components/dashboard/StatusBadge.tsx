import { useTranslation } from "react-i18next";
import { tWorkshopStatus } from "../../lib/i18n-typed";

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={`dashboard-status dashboard-status--${status}`}>
      {tWorkshopStatus(t, status) || status}
    </span>
  );
}
