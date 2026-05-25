import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>{t("notFound.desc")}</p>
      <a href="/">
        <ArrowLeft size={18} aria-hidden="true" />
        {t("notFound.cta")}
      </a>
    </div>
  );
}
