import { ArrowLeft, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "./shared/PageTransition";

export function NotFound() {
  const { t } = useTranslation();
  useSEO({ title: "404", descKey: "notFound.desc" });

  return (
    <PageTransition>
      <div className="not-found">
        <div className="not-found-decoration" aria-hidden="true">
          <span>✿</span>
          <span>✦</span>
          <span>♡</span>
        </div>
        <h1>404</h1>
        <p>{t("notFound.desc")}</p>
        <Link to="/">
          <ArrowLeft size={18} aria-hidden="true" />
          {t("notFound.cta")}
        </Link>
      </div>
    </PageTransition>
  );
}
