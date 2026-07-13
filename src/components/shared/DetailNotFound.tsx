import { memo } from "react";
import { FileQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "./PageTransition";
import { DetailBackLink } from "./DetailBackLink";

type Props = {
  message: string;
  backTo: string;
  backLabel: string;
};

export const DetailNotFound = memo(function DetailNotFound({ message, backTo, backLabel }: Props) {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <section className="detail-state detail-state--not-found" role="status" aria-live="polite">
        <span className="detail-state-marker">ARCHIVE / 404</span>
        <FileQuestion size={36} aria-hidden="true" />
        <h1>{message}</h1>
        <p>{t("common.detailNotFoundHint")}</p>
        <DetailBackLink to={backTo} label={backLabel} />
      </section>
    </PageTransition>
  );
});
