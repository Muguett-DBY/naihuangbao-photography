import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../../hooks/useSiteContent";
import { NewsletterForm } from "../NewsletterForm";
import { PrefetchLink } from "./PrefetchLink";

export function Footer() {
  const { t } = useTranslation();
  const { sectionCopy, siteConfig } = useSiteContent();

  const currentYear = new Date().getFullYear();

  return (
    <footer id="site-footer" className="site-footer is-visible" aria-label={t("footer.ariaLabel", "Site footer")}>
      <div className="footer-issue-line" aria-label="Publication issue">
        <span>NHB / ISSUE 01</span>
        <span>{siteConfig.city} / {currentYear}</span>
      </div>

      <div className="footer-main">
        <div className="footer-brand">
          <span className="footer-brand-name">{siteConfig.brandName}</span>
          <p className="footer-brand-tagline">{t("footer.tagline", { city: siteConfig.city })}</p>
          <p className="footer-note">{sectionCopy.footer.tagline}</p>
          <div className="footer-social">
            <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer" aria-label="Xiaohongshu" className="footer-social-link">
              <MessageCircle size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        <nav className="footer-nav" aria-label={t("footer.navLabel", "Footer navigation")}>
          <div className="footer-nav-group">
            <h3>{t("footer.explore", "Explore")}</h3>
            <PrefetchLink to="/gallery">{t("nav.gallery")}</PrefetchLink>
            <PrefetchLink to="/courses">{t("nav.courses")}</PrefetchLink>
            <PrefetchLink to="/products">{t("nav.presets")}</PrefetchLink>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.services", "Services")}</h3>
            <PrefetchLink to="/workshops">{t("nav.workshops")}</PrefetchLink>
            <PrefetchLink to="/shop">{t("nav.shop")}</PrefetchLink>
            <PrefetchLink to="/booking">{t("nav.booking")}</PrefetchLink>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.discover", "Discover")}</h3>
            <PrefetchLink to="/map">{t("nav.map")}</PrefetchLink>
            <PrefetchLink to="/#why">{t("nav.about", "About")}</PrefetchLink>
            <PrefetchLink to="/booking#faq">{t("nav.faq", "FAQ")}</PrefetchLink>
          </div>
        </nav>

        <div className="footer-newsletter">
          <span className="footer-column-index">04 / STUDIO LETTERS</span>
          <h3>{t("newsletter.title")}</h3>
          <p>{t("newsletter.description")}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          {t("footer.copyright", { year: currentYear, brand: siteConfig.brandName })}
        </p>
        <p className="footer-tagline">{siteConfig.city} PORTRAIT FIELD NOTES / EST. {currentYear}</p>
      </div>

    </footer>
  );
}
