import { ArrowUp, ExternalLink } from "lucide-react";
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

  return (
    <footer className={`site-footer ${inView ? "is-visible" : ""}`} ref={ref}>
      <div className="footer-brand">
        <span>{siteConfig.brandName}</span>
        <p>{t("footer.tagline", { city: siteConfig.city })}</p>
      </div>
      <div className="footer-links">
        <Link to="/gallery">{t("nav.gallery")}</Link>
        <Link to="/courses">{t("nav.courses")}</Link>
        <Link to="/products">{t("nav.presets")}</Link>
        <Link to="/workshops">{t("nav.workshops")}</Link>
        <Link to="/shop">{t("nav.shop")}</Link>
        <Link to="/map">{t("nav.map")}</Link>
        <Link to="/booking">{t("nav.booking")}</Link>
      </div>
      <div className="footer-social">
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          {t("common.socialXiaohongshu")}<ExternalLink size={12} />
        </a>
      </div>
      <div className="footer-newsletter">
        <NewsletterForm />
      </div>
      <p className="footer-tagline">{sectionCopy.footer.tagline}</p>
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
