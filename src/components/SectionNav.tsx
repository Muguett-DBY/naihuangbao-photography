import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SECTIONS = [
  { id: "top", labelKey: "nav.home" },
  { id: "gallery", labelKey: "nav.gallery" },
  { id: "mid-cta", labelKey: "nav.details" },
  { id: "why", labelKey: "nav.packages" },
  { id: "packages", labelKey: "nav.packages" },
  { id: "details", labelKey: "nav.details" },
  { id: "process", labelKey: "nav.faq" },
  { id: "booking", labelKey: "nav.booking" },
] as const;

export function SectionNav() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const els = SECTIONS.map(
      (s) => document.getElementById(s.id) || document.querySelector(`[data-section="${s.id}"]`),
    ).filter(Boolean) as HTMLElement[];

    if (!els.length) return;

    const update = () => {
      const viewportH = window.innerHeight;
      let activeIdx = 0;
      for (let i = els.length - 1; i >= 0; i--) {
        const rect = els[i].getBoundingClientRect();
        if (rect.top < viewportH * 0.4) {
          activeIdx = i;
          break;
        }
      }
      setActive(activeIdx);
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(update);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (index: number) => {
    const el = document.getElementById(SECTIONS[index].id) ||
      document.querySelector(`[data-section="${SECTIONS[index].id}"]`);
    if (el) {
      const win = window as any;
      if (win.lenis) {
        win.lenis.scrollTo(el, { offset: 64 });
      } else {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <nav className="section-nav" aria-label={t("sectionNav.ariaLabel")}>
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          className={`section-nav-dot${i === active ? " is-active" : ""}`}
          onClick={() => scrollTo(i)}
          title={t(s.labelKey)}
          aria-label={t(s.labelKey)}
          aria-current={i === active ? "true" : undefined}
        >
          <span className="section-nav-label">{t(s.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
