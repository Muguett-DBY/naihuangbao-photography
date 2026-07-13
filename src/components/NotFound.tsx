import "../styles/boundaries.css";
import { ArchiveX, ArrowLeft, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "./shared/PageTransition";

export function NotFound() {
  const { t } = useTranslation();
  useSEO({ title: "404", descKey: "notFound.desc" });

  return (
    <PageTransition className="not-found-page">
      <section className="not-found" id="top" aria-labelledby="not-found-title">
        <span className="not-found-kicker">LOST FRAME / 404</span>
        <ArchiveX size={36} strokeWidth={1.5} aria-hidden="true" />
        <p className="not-found-code" aria-hidden="true">404</p>
        <h1 id="not-found-title">{t("notFound.title")}</h1>
        <p>{t("notFound.desc")}</p>
        <div className="not-found-actions">
          <Link to="/" className="not-found-action not-found-action--primary">
            <ArrowLeft size={18} aria-hidden="true" />
            {t("notFound.cta")}
          </Link>
          <Link to="/gallery" className="not-found-action">
            <Images size={18} aria-hidden="true" />
            {t("nav.gallery")}
          </Link>
        </div>
      </section>
    </PageTransition>
  );
}
