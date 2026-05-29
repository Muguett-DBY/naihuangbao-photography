import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "./shared/PageTransition";

export function NotFound() {
  const { t } = useTranslation();
  useSEO({ title: "404", descKey: "notFound.desc" });

  return (
    <PageTransition>
      <div className="not-found">
        <h1>404</h1>
        <p>{t("notFound.desc")}</p>
        <a href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          {t("notFound.cta")}
        </a>
      </div>
    </PageTransition>
  );
}
