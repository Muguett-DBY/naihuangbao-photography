import { CalendarCheck, Camera, Languages, Menu, X, User, LogOut, LogIn, LayoutDashboard, Paintbrush } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import { MoodToggle } from "../MoodToggle";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useSiteContent } from "../../hooks/useSiteContent";
import { useAuth } from "../../hooks/useAuth";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
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
    { to: "/workshops", label: t("nav.workshops") },
    { to: "/shop", label: t("nav.shop") },
    { to: "/editor", label: t("nav.editor") },
    { to: "/map", label: t("nav.map") },
    { to: "/booking", label: t("nav.booking") },
  ], [t]);

  const LANG_CYCLE = ["en", "zh-CN", "ko", "ja"] as const;

  const toggleLang = () => {
    const current = i18n.language;
    const idx = LANG_CYCLE.indexOf(current as (typeof LANG_CYCLE)[number]);
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
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
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
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
    setOpen(false);
  }, [location.pathname]);

  return (<>
    <header ref={navRef} className={`site-nav${scrolled ? " is-scrolled" : ""}`}>
      <Link className="brand-mark" to="/" aria-label={t("nav.backToHome")}>
        <Camera size={18} />
        <span>{siteConfig.brandName}</span>
      </Link>
      <nav className="nav-menu nav-menu--inline" aria-label={t("nav.mainNavigation")}>
        {navItems.map((item) => (
          <Link
            to={item.to}
            key={item.to}
            className={location.pathname === item.to ? "is-active" : ""}
            aria-current={location.pathname === item.to ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
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
        className="lang-toggle"
        onClick={toggleLang}
        title={t("langToggle.label")}
        aria-label={t("langToggle.label")}
        style={{ fontSize: 13, width: "auto", paddingInline: 8 }}
      >
        <Languages size={14} />
        <span style={{ marginLeft: 3 }}>{t(`langToggle.languages.${i18n.language}` as any)}</span>
      </button>
      <div ref={userMenuRef} className="nav-user-menu">
        {user ? (
          <>
            <button
              className="mood-toggle"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{ fontSize: 13, width: "auto", paddingInline: 8, display: "flex", alignItems: "center", gap: 4 }}
              aria-label={t("auth.userMenu", "用户菜单")}
              aria-expanded={userMenuOpen}
            >
              <User size={14} />
              <span style={{ marginLeft: 3 }}>{user.displayName}</span>
            </button>
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: 8,
                  minWidth: 160,
                  zIndex: 100,
                }}
              >
                <div style={{ padding: "8px 12px", fontSize: "0.85rem", color: "var(--caramel-muted)", borderBottom: "1px solid var(--border-subtle)", marginBottom: 4 }}>
                  {user.email}
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setUserMenuOpen(false)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "var(--caramel-muted)",
                    borderRadius: 4,
                    textDecoration: "none",
                  }}
                >
                  <LayoutDashboard size={14} />
                  {t("dashboard.title", "个人中心")}
                </Link>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "var(--caramel-muted)",
                    borderRadius: 4,
                  }}
                >
                  <LogOut size={14} />
                  {t("auth.logout", "退出登录")}
                </button>
              </div>
            )}
          </>
        ) : (
          <Link
            to="/login"
            className="nav-login"
            style={{ fontSize: 13, width: "auto", paddingInline: 8, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
          >
            <LogIn size={14} />
            <span style={{ marginLeft: 3 }}>{t("auth.login", "登录")}</span>
          </Link>
        )}
      </div>
      <Link className="nav-cta" to="/booking" onClick={() => setOpen(false)}>
        <CalendarCheck size={16} />
        {t("nav.booking")}
      </Link>
    </header>
    {createPortal(
      <nav id="site-navigation-menu" className={`nav-menu nav-menu--overlay${open ? " is-open" : ""}`} aria-label={t("nav.mainNavigation")}>
        {navItems.map((item) => (
          <Link
            to={item.to}
            key={item.to}
            className={location.pathname === item.to ? "is-active" : ""}
            aria-current={location.pathname === item.to ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>,
      document.body,
    )}
  </>);
}
