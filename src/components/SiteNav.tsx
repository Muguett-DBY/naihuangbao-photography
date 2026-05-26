import { CalendarCheck, Camera, Languages, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { MoodToggle } from "./MoodToggle";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../hooks/useSiteContent";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { t, i18n } = useTranslation();
  const { siteConfig } = useSiteContent();

  const navItems = [
    { href: "#top", label: t("nav.home") },
    { href: "#gallery", label: t("nav.gallery") },
    { href: "#packages", label: t("nav.packages") },
    { href: "#process", label: t("nav.details") },
    { href: "#faq", label: t("nav.faq") },
    { href: "#booking", label: t("nav.booking") },
  ];

  const LANG_CYCLE = ["en", "zh-CN", "ko", "ja"] as const;

  const toggleLang = () => {
    const current = i18n.language;
    const idx = LANG_CYCLE.indexOf(current as typeof LANG_CYCLE[number]);
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  useEffect(() => {
    let frameId: number | null = null;
    let currentScrolled = false;

    function syncNavState() {
      frameId = null;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      navRef.current?.style.setProperty("--scroll-progress", progress.toFixed(4));

      const nextScrolled = window.scrollY > 80;
      if (nextScrolled !== currentScrolled) {
        currentScrolled = nextScrolled;
        setScrolled(nextScrolled);
      }
    }

    function scheduleSync() {
      if (frameId === null) {
        frameId = requestAnimationFrame(syncNavState);
      }
    }

    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync, { passive: true });
    scheduleSync();
    return () => {
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-lock", open);
    return () => document.body.classList.remove("nav-lock");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header ref={navRef} className={`site-nav${scrolled ? " is-scrolled" : ""}`}>
      <a className="brand-mark" href="#top" aria-label="回到首页">
        <Camera size={18} />
        <span>{siteConfig.brandName}</span>
      </a>
      <nav id="site-navigation-menu" className={`nav-menu${open ? " is-open" : ""}`} aria-label="主导航">
        {navItems.map((item) => (
          <a href={item.href} key={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </nav>
      <button
        className="hamburger"
        type="button"
        onClick={() => setOpen(!open)}
        aria-controls="site-navigation-menu"
        aria-expanded={open}
        aria-label={open ? t("nav.close", "关闭菜单") : t("nav.open", "打开菜单")}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <MoodToggle />
      <ThemeToggle />
      <button
        className="mood-toggle"
        onClick={toggleLang}
        title={t("langToggle.label")}
        aria-label={t("langToggle.label")}
        style={{ fontSize: 13, width: "auto", paddingInline: 8 }}
      >
        <Languages size={14} />
        <span style={{ marginLeft: 3 }}>{t(`langToggle.languages.${i18n.language}` as any)}</span>
      </button>
      <a className="nav-cta" href="#booking" onClick={() => setOpen(false)}>
        <CalendarCheck size={16} />
        {t("nav.booking")}
      </a>
    </header>
  );
}
