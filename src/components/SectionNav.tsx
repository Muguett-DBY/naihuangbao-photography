import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "hero", label: "首页" },
  { id: "gallery", label: "作品" },
  { id: "mid-cta", label: "风格" },
  { id: "why-choose-us", label: "优势" },
  { id: "packages", label: "套餐" },
  { id: "service-details", label: "服务" },
  { id: "process-and-faq", label: "流程" },
  { id: "about-booking", label: "预约" },
] as const;

export function SectionNav() {
  const [active, setActive] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const els = SECTIONS.map(
      (s) => document.getElementById(s.id) || document.querySelector(`[data-section="${s.id}"]`),
    ).filter(Boolean) as HTMLElement[];

    if (!els.length) return;

    const update = () => {
      const scrollY = window.scrollY + window.innerHeight * 0.3;
      let activeIdx = 0;
      for (let i = els.length - 1; i >= 0; i--) {
        if (els[i].offsetTop <= scrollY) {
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
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="section-nav" aria-label="页面章节导航">
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          className={`section-nav-dot${i === active ? " is-active" : ""}`}
          onClick={() => scrollTo(i)}
          title={s.label}
          aria-label={`跳转到${s.label}`}
          aria-current={i === active ? "true" : undefined}
        >
          <span className="section-nav-label">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}
