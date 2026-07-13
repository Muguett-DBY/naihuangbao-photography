import {
  Bot,
  CalendarCheck,
  Camera,
  ChevronDown,
  Languages,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { safeLocalStorage } from "../../lib/browser-storage";
import { useAuth } from "../../hooks/useAuth";
import { useSiteContent } from "../../hooks/useSiteContent";
import { MoodToggle } from "../MoodToggle";
import { ThemeToggle } from "../ThemeToggle";
import { PrefetchLink } from "./PrefetchLink";

const LANG_CYCLE = ["en", "zh-CN", "ko", "ja"] as const;
const FOCUSABLE =
  'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

type UtilityControlsProps = {
  onLanguageChange: () => void;
  languageLabel: string;
  menuLabel: string;
};

type HeaderProps = {
  onOpenChat: () => void;
};

function UtilityControls({ onLanguageChange, languageLabel, menuLabel }: UtilityControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="nav-utility-controls" aria-label={menuLabel}>
      <button
        className="lang-toggle"
        type="button"
        onClick={onLanguageChange}
        title={t("langToggle.label")}
        aria-label={t("langToggle.label")}
      >
        <Languages size={16} aria-hidden="true" />
        <span>{languageLabel}</span>
      </button>
      <MoodToggle />
      <ThemeToggle />
    </div>
  );
}

export function Header({ onOpenChat }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const utilityButtonRef = useRef<HTMLButtonElement>(null);
  const utilityMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const { siteConfig } = useSiteContent();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = useMemo(
    () => [
      { to: "/", label: t("nav.home") },
      { to: "/gallery", label: t("nav.gallery") },
      { to: "/courses", label: t("nav.courses") },
      { to: "/products", label: t("nav.presets") },
      { to: "/shop", label: t("nav.shop") },
      { to: "/booking", label: t("nav.booking") },
    ],
    [t],
  );

  const isCurrent = (path: string) =>
    path === "/" ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const toggleLang = () => {
    const index = LANG_CYCLE.indexOf(i18n.language as (typeof LANG_CYCLE)[number]);
    const next = LANG_CYCLE[(index + 1) % LANG_CYCLE.length];
    void i18n.changeLanguage(next);
    safeLocalStorage.setItem("lang", next);
  };

  useEffect(() => {
    let frameId: number | null = null;
    const sync = () => {
      frameId = null;
      setScrolled(window.scrollY > 48);
    };
    const schedule = () => {
      if (frameId === null) frameId = window.requestAnimationFrame(sync);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-lock", drawerOpen);
    return () => document.body.classList.remove("nav-lock");
  }, [drawerOpen]);

  useEffect(() => {
    setDrawerOpen(false);
    setUtilityOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    const focusable = Array.from(drawer?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      (hamburgerRef.current ?? previouslyFocused)?.focus();
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!utilityOpen) return;
    utilityMenuRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (
        !utilityMenuRef.current?.contains(event.target as Node) &&
        !utilityButtonRef.current?.contains(event.target as Node)
      ) {
        setUtilityOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const controls = Array.from(utilityMenuRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (event.key === "Escape") {
        event.preventDefault();
        setUtilityOpen(false);
        utilityButtonRef.current?.focus();
      } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && controls.length > 0) {
        event.preventDefault();
        const current = controls.indexOf(document.activeElement as HTMLElement);
        const direction = event.key === "ArrowDown" ? 1 : -1;
        controls[(current + direction + controls.length) % controls.length].focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [utilityOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    userMenuRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node) && !userButtonRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setUserMenuOpen(false);
        userButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  const languageLabel = t(`langToggle.languages.${i18n.language}` as never);
  const utilityLabel = t("nav.utilityMenu", "Display and language settings");

  const openChatFromDrawer = () => {
    setDrawerOpen(false);
    window.requestAnimationFrame(onOpenChat);
  };

  return (
    <>
      <header className={`site-nav${scrolled ? " is-scrolled" : ""}`}>
        <PrefetchLink className="brand-mark" to="/" aria-label={t("nav.backToHome")}>
          <span className="brand-seal" aria-hidden="true">
            <Camera size={18} />
          </span>
          <span className="brand-copy">
            <strong>{siteConfig.brandName}</strong>
            <small>NHB / FIELD NOTES</small>
          </span>
        </PrefetchLink>

        <nav className="nav-menu nav-menu--inline" aria-label={t("nav.mainNavigation")}>
          {navItems.map((item, index) => (
            <PrefetchLink
              to={item.to}
              key={item.to}
              className={isCurrent(item.to) ? "is-active" : ""}
              aria-current={isCurrent(item.to) ? "page" : undefined}
            >
              <span className="nav-route-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </PrefetchLink>
          ))}
        </nav>

        <div className="nav-actions">
          <div className="nav-utility-menu">
            <button
              ref={utilityButtonRef}
              className="nav-icon-button nav-utility-trigger"
              type="button"
              aria-label={utilityLabel}
              aria-expanded={utilityOpen}
              aria-controls="nav-utility-panel"
              onClick={() => {
                setUtilityOpen((value) => !value);
                setUserMenuOpen(false);
              }}
            >
              <Settings2 size={18} aria-hidden="true" />
            </button>
            {utilityOpen ? (
              <div ref={utilityMenuRef} id="nav-utility-panel" className="nav-popover nav-utility-panel">
                <span className="nav-popover-label">NHB / UTILITIES</span>
                <UtilityControls onLanguageChange={toggleLang} languageLabel={languageLabel} menuLabel={utilityLabel} />
              </div>
            ) : null}
          </div>

          <div className="nav-user-menu">
            {user ? (
              <>
                <button
                  ref={userButtonRef}
                  className="nav-account-action"
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((value) => !value);
                    setUtilityOpen(false);
                  }}
                  aria-label={t("auth.userMenu", "User menu")}
                  aria-expanded={userMenuOpen}
                  aria-controls="nav-account-panel"
                >
                  <User size={17} aria-hidden="true" />
                  <span>{user.displayName}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {userMenuOpen ? (
                  <div ref={userMenuRef} id="nav-account-panel" className="nav-popover nav-user-dropdown">
                    <span className="nav-user-email">{user.email}</span>
                    <PrefetchLink to="/dashboard" onClick={() => setUserMenuOpen(false)} className="nav-user-link">
                      <LayoutDashboard size={16} aria-hidden="true" />
                      {t("dashboard.title", "Dashboard")}
                    </PrefetchLink>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="nav-user-link"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      {t("auth.logout", "Log out")}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <PrefetchLink to="/login" className="nav-account-action nav-login">
                <LogIn size={17} aria-hidden="true" />
                <span>{t("auth.login", "Log in")}</span>
              </PrefetchLink>
            )}
          </div>

          <PrefetchLink className="nav-cta" to="/booking">
            <CalendarCheck size={17} aria-hidden="true" />
            {t("nav.booking")}
          </PrefetchLink>

          <button
            ref={hamburgerRef}
            className="hamburger"
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-controls="site-navigation-menu"
            aria-expanded={drawerOpen}
            aria-label={t("nav.open", "Open menu")}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {createPortal(
        drawerOpen ? (
          <aside
            ref={drawerRef}
            id="site-navigation-menu"
            className="nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.mainNavigation")}
          >
            <button
              className="nav-drawer-backdrop"
              type="button"
              tabIndex={-1}
              onClick={() => setDrawerOpen(false)}
              aria-label={t("nav.close", "Close menu")}
            />
            <div className="nav-drawer-panel">
              <div className="nav-drawer-head">
                <span>
                  <strong>NHB / ISSUE 01</strong>
                  <small>{siteConfig.city} PORTRAIT FIELD NOTES</small>
                </span>
                <button className="nav-drawer-close" type="button" onClick={() => setDrawerOpen(false)} aria-label={t("nav.close", "Close menu")}>
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <nav className="nav-drawer-routes" aria-label={t("nav.mainNavigation")}>
                {navItems.map((item, index) => (
                  <PrefetchLink
                    to={item.to}
                    key={item.to}
                    className={isCurrent(item.to) ? "is-active" : ""}
                    aria-current={isCurrent(item.to) ? "page" : undefined}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    {item.label}
                  </PrefetchLink>
                ))}
              </nav>

              <section className="nav-drawer-utilities" aria-labelledby="drawer-utility-label">
                <span id="drawer-utility-label" className="nav-popover-label">NHB / UTILITIES</span>
                <UtilityControls onLanguageChange={toggleLang} languageLabel={languageLabel} menuLabel={utilityLabel} />
              </section>

              <div className="nav-drawer-actions">
                {user ? (
                  <>
                    <PrefetchLink to="/dashboard" onClick={() => setDrawerOpen(false)}>
                      <LayoutDashboard size={18} aria-hidden="true" />
                      {t("dashboard.title", "Dashboard")}
                    </PrefetchLink>
                    <button type="button" onClick={() => { logout(); setDrawerOpen(false); }}>
                      <LogOut size={18} aria-hidden="true" />
                      {t("auth.logout", "Log out")}
                    </button>
                  </>
                ) : (
                  <PrefetchLink to="/login" onClick={() => setDrawerOpen(false)}>
                    <LogIn size={18} aria-hidden="true" />
                    {t("auth.login", "Log in")}
                  </PrefetchLink>
                )}
                <button
                  className="nav-drawer-chat"
                  type="button"
                  onClick={openChatFromDrawer}
                  aria-label={t("chat.launcherLabel", "AI Chat")}
                >
                  <Bot size={18} aria-hidden="true" />
                  {t("chat.launcherLabel", "AI Chat")}
                </button>
                <PrefetchLink className="nav-drawer-booking" to="/booking" onClick={() => setDrawerOpen(false)}>
                  <CalendarCheck size={18} aria-hidden="true" />
                  {t("nav.booking")}
                </PrefetchLink>
              </div>
            </div>
          </aside>
        ) : null,
        document.body,
      )}
    </>
  );
}
