import { CalendarCheck, Camera, Languages, Menu, X, User, LogOut, LogIn, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import { MoodToggle } from "../MoodToggle";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "../../hooks/useSiteContent";
import { useAuth } from "../../hooks/useAuth";
import { PrefetchLink } from "./PrefetchLink";
import { safeLocalStorage } from "../../lib/browser-storage";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const overlayNavRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const { siteConfig } = useSiteContent();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = useMemo(() => [
    { to: "/", label: t("nav.home") },
    { to: "/gallery", label: t("nav.gallery") },
    { to: "/courses", label: t("nav.courses") },
    { to: "/products", label: t("nav.presets") },
    { to: "/shop", label: t("nav.shop") },
    { to: "/booking", label: t("nav.booking") },
  ], [t]);

  const LANG_CYCLE = ["en", "zh-CN", "ko", "ja"] as const;

  const toggleLang = () => {
    const current = i18n.language;
    const idx = LANG_CYCLE.indexOf(current as (typeof LANG_CYCLE)[number]);
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
    i18n.changeLanguage(next);
    safeLocalStorage.setItem("lang", next);
  };

  useEffect(() => {
    let frameId: number | null = null;
    let currentScrolled = false;

    function syncNavState() {
      frameId = null;
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
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-lock", open);
    return () => document.body.classList.remove("nav-lock");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = overlayNavRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => overlayNavRef.current?.querySelector<HTMLElement>("a[href]")?.focus(), 0);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!userMenuRef.current) return;
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        userMenuRef.current.querySelector<HTMLElement>("button")?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = Array.from(userMenuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      const menuItems = items.slice(1);
      if (!menuItems.length) return;
      event.preventDefault();
      const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = currentIndex < 0
        ? 0
        : (currentIndex + direction + menuItems.length) % menuItems.length;
      menuItems[nextIndex].focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [userMenuOpen]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (<>
    <header ref={navRef} className={`site-nav${scrolled ? " is-scrolled" : ""}`}>
      <PrefetchLink className="brand-mark" to="/" aria-label={t("nav.backToHome")}>
        <Camera size={18} />
        <span>{siteConfig.brandName}</span>
      </PrefetchLink>
      <nav className="nav-menu nav-menu--inline" aria-label={t("nav.mainNavigation")}>
        {navItems.map((item) => (
          <PrefetchLink
            to={item.to}
            key={item.to}
            className={location.pathname === item.to ? "is-active" : ""}
            aria-current={location.pathname === item.to ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </PrefetchLink>
        ))}
      </nav>
      <button
        ref={hamburgerRef}
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
        className="lang-toggle"
        onClick={toggleLang}
        title={t("langToggle.label")}
        aria-label={t("langToggle.label")}
        style={{ fontSize: 13, width: "auto", paddingInline: 8 }}
      >
        <Languages size={14} />
        <span style={{ marginLeft: 3 }}>{t(`langToggle.languages.${i18n.language}` as never)}</span>
      </button>
      <div ref={userMenuRef} className="nav-user-menu">
        {user ? (
          <>
            <button
              className="mood-toggle nav-user-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label={t("auth.userMenu", "用户菜单")}
              aria-expanded={userMenuOpen}
            >
              <User size={14} />
              <span>{user.displayName}</span>
            </button>
            {userMenuOpen && (
              <div className="nav-user-dropdown">
                <div className="nav-user-email">
                  {user.email}
                </div>
                <PrefetchLink
                  to="/dashboard"
                  onClick={() => setUserMenuOpen(false)}
                  className="nav-user-link"
                >
                  <LayoutDashboard size={14} />
                  {t("dashboard.title", "个人中心")}
                </PrefetchLink>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="nav-user-link"
                >
                  <LogOut size={14} />
                  {t("auth.logout", "退出登录")}
                </button>
              </div>
            )}
          </>
        ) : (
          <PrefetchLink
            to="/login"
            className="nav-login nav-user-btn"
          >
            <LogIn size={14} />
            <span>{t("auth.login", "登录")}</span>
          </PrefetchLink>
        )}
      </div>
      <PrefetchLink className="nav-cta" to="/booking" onClick={() => setOpen(false)}>
        <CalendarCheck size={16} />
        {t("nav.booking")}
      </PrefetchLink>
    </header>
    {createPortal(
      <nav ref={overlayNavRef} id="site-navigation-menu" className={`nav-menu nav-menu--overlay${open ? " is-open" : ""}`} aria-label={t("nav.mainNavigation")} aria-hidden={!open}>
        {navItems.map((item) => (
          <PrefetchLink
            to={item.to}
            key={item.to}
            className={location.pathname === item.to ? "is-active" : ""}
            aria-current={location.pathname === item.to ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </PrefetchLink>
        ))}
      </nav>,
      document.body,
    )}
  </>);
}
