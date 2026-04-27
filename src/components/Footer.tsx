import { ArrowUp, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "../data/site";
import { useInView } from "../hooks/useInView";

export function Footer() {
  const [showTop, setShowTop] = useState(false);
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.1 });

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
        <a href="#gallery">作品</a>
        <a href="#packages">套餐</a>
        <a href="#notice">须知</a>
      </div>
      <div className="footer-social">
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          小红书 <ExternalLink size={12} />
        </a>
      </div>
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
