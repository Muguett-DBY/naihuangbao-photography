import "../styles/platform-v3.css";
import { Code2, ExternalLink, FlaskConical, Layers3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { useSEO } from "../hooks/useSEO";

export function AboutPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "platform.about.title", descKey: "platform.about.description", path: "/about" });

  return (
    <PageTransition className="platform-page about-page">
      <section className="about-intro">
        <div className="about-intro__copy">
          <span className="platform-index">NHB / PERSONAL PRACTICE PROJECT</span>
          <h1>{t("platform.about.title")}</h1>
          <p>{t("platform.about.description")}</p>
          <strong>{t("platform.about.disclosure")}</strong>
        </div>
        <div className="about-intro__media">
          <ImageWithFallback
            src="/images/optical-archive/archive-contact-sheet-v1.webp?v=20260808-1"
            alt={t("opticalArchive.contactSheetAlt")}
            title={t("platform.about.title")}
            priority
            sizes="(max-width: 768px) 100vw, 48vw"
            tone="cream"
          />
        </div>
      </section>

      <section className="about-principles" aria-labelledby="about-principles-title">
        <div className="platform-section-head"><div><span className="platform-index">01 / PRINCIPLES</span><h2 id="about-principles-title">{t("platform.about.principles")}</h2></div></div>
        <div className="about-principle-grid">
          <article><FlaskConical aria-hidden="true" /><h3>{t("platform.about.practiceTitle")}</h3><p>{t("platform.about.practiceCopy")}</p></article>
          <article><Layers3 aria-hidden="true" /><h3>{t("platform.about.systemTitle")}</h3><p>{t("platform.about.systemCopy")}</p></article>
          <article><Code2 aria-hidden="true" /><h3>{t("platform.about.openTitle")}</h3><p>{t("platform.about.openCopy")}</p></article>
        </div>
        <div className="about-actions">
          <PrefetchLink to="/studio">{t("platform.about.openStudio")}</PrefetchLink>
          <PrefetchLink to="/lab">{t("platform.about.openLab")}</PrefetchLink>
          <a href="https://github.com/" target="_blank" rel="noreferrer"><ExternalLink size={18} aria-hidden="true" /> GitHub</a>
        </div>
      </section>
    </PageTransition>
  );
}
