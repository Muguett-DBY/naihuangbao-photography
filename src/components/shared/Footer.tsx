import { ArrowUp, ExternalLink, Camera, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useInView } from "../../hooks/useInView";
import { useSiteContent } from "../../hooks/useSiteContent";
import { NewsletterForm } from "../NewsletterForm";

export function Footer() {
  const { t } = useTranslation();
  const [showTop, setShowTop] = useState(false);
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.1 });
  const { sectionCopy, siteConfig } = useSiteContent();

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <footer id="site-footer" className={`site-footer ${inView ? "is-visible" : ""}`} ref={ref} aria-label={t("footer.ariaLabel", "Site footer")}>
      <div className="footer-main">
        <div className="footer-brand">
          <span className="footer-brand-name">{siteConfig.brandName}</span>
          <p className="footer-brand-tagline">{t("footer.tagline", { city: siteConfig.city })}</p>
          <div className="footer-social">
            <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer" aria-label="Xiaohongshu" className="footer-social-link">
              <MessageCircle size={18} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="footer-social-link">
              <Camera size={18} />
            </a>
          </div>
        </div>
        <nav className="footer-nav" aria-label={t("footer.navLabel", "Footer navigation")}>
          <div className="footer-nav-group">
            <h3>{t("footer.explore", "Explore")}</h3>
            <Link to="/gallery">{t("nav.gallery")}</Link>
            <Link to="/courses">{t("nav.courses")}</Link>
            <Link to="/products">{t("nav.presets")}</Link>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.services", "Services")}</h3>
            <Link to="/workshops">{t("nav.workshops")}</Link>
            <Link to="/shop">{t("nav.shop")}</Link>
            <Link to="/booking">{t("nav.booking")}</Link>
          </div>
          <div className="footer-nav-group">
            <h3>{t("footer.discover", "Discover")}</h3>
            <Link to="/map">{t("nav.map")}</Link>
            <Link to="/about">{t("nav.about", "About")}</Link>
            <Link to="/faq">{t("nav.faq", "FAQ")}</Link>
          </div>
        </nav>
      </div>
      <div className="footer-newsletter">
        <h3>{t("newsletter.title")}</h3>
        <p>{t("newsletter.description")}</p>
        <NewsletterForm />
      </div>
      <div className="footer-bottom">
        <p className="footer-copyright">
          {t("footer.copyright", { year: currentYear, brand: siteConfig.brandName })}
        </p>
        <p className="footer-tagline">{sectionCopy.footer.tagline}</p>
      </div>
      <button
        className={`scroll-top${showTop ? " is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={t("footer.backToTop")}
      >
        <ArrowUp size={18} />
      </button>
    </footer>
  );
}
