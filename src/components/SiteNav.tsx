import { CalendarCheck, Camera, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSiteContent } from "../hooks/useSiteContent";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { siteConfig } = useSiteContent();

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

      const nextScrolled = window.scrollY > 60;
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
        <a href="#gallery" onClick={() => setOpen(false)}>作品</a>
        <a href="#packages" onClick={() => setOpen(false)}>套餐</a>
        <a href="#notice" onClick={() => setOpen(false)}>须知</a>
      </nav>
      <button
        className="hamburger"
        type="button"
        onClick={() => setOpen(!open)}
        aria-controls="site-navigation-menu"
        aria-expanded={open}
        aria-label={open ? "关闭菜单" : "打开菜单"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <a className="nav-cta" href="#booking" onClick={() => setOpen(false)}>
        <CalendarCheck size={16} />
        预约
      </a>
    </header>
  );
}
