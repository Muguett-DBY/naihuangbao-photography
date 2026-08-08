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
        <span>NHB / LIVING ARCHIVE</span>
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
            <PrefetchLink to="/archive">{t("nav.archive")}</PrefetchLink>
            <PrefetchLink to="/stories">{t("nav.stories")}</PrefetchLink>
            <PrefetchLink to="/gallery">{t("nav.gallery")}</PrefetchLink>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.create", "Create")}</h3>
            <PrefetchLink to="/create">{t("nav.create")}</PrefetchLink>
            <PrefetchLink to="/editor">{t("nav.editor")}</PrefetchLink>
            <PrefetchLink to="/compare">{t("photoCompare.title")}</PrefetchLink>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.discover", "Discover")}</h3>
            <PrefetchLink to="/lab">{t("nav.lab")}</PrefetchLink>
            <PrefetchLink to="/about">{t("nav.about")}</PrefetchLink>
            <PrefetchLink to="/map">{t("nav.map")}</PrefetchLink>
          </div>
        </nav>

        <div className="footer-newsletter">
          <span className="footer-column-index">04 / LITTLE LETTERS</span>
          <h3>{t("newsletter.title")}</h3>
          <p>{t("newsletter.description")}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          {t("footer.copyright", { year: currentYear, brand: siteConfig.brandName })}
        </p>
        <p className="footer-tagline">{siteConfig.city} / PORTRAITS, LIGHT &amp; SMALL MOMENTS / EST. {currentYear}</p>
      </div>

    </footer>
  );
}
