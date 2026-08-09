import { CalendarCheck, FlaskConical, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../../hooks/useSiteContent";
import { PrefetchLink } from "./PrefetchLink";

export function Footer() {
  const { t } = useTranslation();
  const { sectionCopy, siteConfig } = useSiteContent();

  const currentYear = new Date().getFullYear();

  return (
    <footer id="site-footer" className="site-footer is-visible" aria-label={t("footer.ariaLabel", "Site footer")}>
      <div className="footer-issue-line" aria-label={t("footer.ariaLabel")}>
        <span>{t("nav.brandDescriptor")}</span>
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
            <PrefetchLink to="/about">{t("nav.about")}</PrefetchLink>
            <PrefetchLink to="/map">{t("nav.map")}</PrefetchLink>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.services", "Services")}</h3>
            <PrefetchLink to="/booking">{t("nav.booking")}</PrefetchLink>
            <PrefetchLink to="/booking#packages">{t("nav.packages")}</PrefetchLink>
            <PrefetchLink to="/booking#faq">{t("nav.faq")}</PrefetchLink>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.discover", "Discover")}</h3>
            <PrefetchLink to="/archive">{t("nav.archive")}</PrefetchLink>
            <PrefetchLink to="/stories">{t("nav.stories")}</PrefetchLink>
            <PrefetchLink to="/practice"><FlaskConical size={15} aria-hidden="true" />{t("platform.lab.title")}</PrefetchLink>
          </div>
        </nav>

        <div className="footer-newsletter footer-booking-prompt">
          <span className="footer-column-index">04 / {t("footer.bookingDesk")}</span>
          <h3>{sectionCopy.about.bookingTitle}</h3>
          <p>{t("footer.bookingPrompt")}</p>
          <PrefetchLink className="footer-booking-link" to="/booking">
            <CalendarCheck size={17} aria-hidden="true" />
            {t("nav.booking")}
          </PrefetchLink>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          {t("footer.copyright", { year: currentYear, brand: siteConfig.brandName })}
        </p>
        <p className="footer-tagline">{siteConfig.city} / {t("nav.brandDescriptor")} / {currentYear}</p>
      </div>

    </footer>
  );
}
