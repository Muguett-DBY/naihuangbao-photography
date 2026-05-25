import { ArrowUp, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "../hooks/useInView";
import { useSiteContent } from "../hooks/useSiteContent";

export function Footer() {
  const { t } = useTranslation();
  const [showTop, setShowTop] = useState(false);
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.1 });
  const { sectionCopy, siteConfig } = useSiteContent();

  useEffect(() => {
    function onScroll() { setShowTop(window.scrollY > 400); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <footer className={`site-footer ${inView ? "is-visible" : ""}`} ref={ref}>
      <div className="footer-brand">
        <span>{siteConfig.brandName}</span>
        <p>{siteConfig.city} · 女生写真 · 情侣约拍</p>
      </div>
      <div className="footer-links">
        <a href="#gallery">{t("nav.gallery")}</a>
        <a href="#packages">{t("nav.packages")}</a>
        <a href="#notice">{t("nav.faq")}</a>
      </div>
      <div className="footer-social">
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          小红书<ExternalLink size={12} />
        </a>
      </div>
      <p className="footer-tagline">{sectionCopy.footer.tagline}</p>
      <button
        className={`scroll-top${showTop ? " is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="回到顶部"
      >
        <ArrowUp size={18} />
      </button>
    </footer>
  );
}
