import { memo } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "./PageTransition";

type Props = {
  label?: string;
};

export const DetailLoading = memo(function DetailLoading({ label }: Props) {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <main className="detail-state detail-state--loading" role="status" aria-live="polite" aria-busy="true">
        <span className="detail-state-marker">OPENING / 00</span>
        <Loader2 className="detail-state-spinner" size={32} aria-hidden="true" />
        <h1>{label || t("common.loading")}</h1>
        <p>{t("common.detailLoadingHint")}</p>
      </main>
    </PageTransition>
  );
});
