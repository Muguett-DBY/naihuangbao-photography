import {
  Bot,
  CalendarCheck,
  Camera,
  Languages,
  Menu,
  Search,
  Settings2,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { safeLocalStorage } from "../../lib/browser-storage";
import { openCommandPalette } from "../../lib/command-palette";
import { loadAndChangeLanguage } from "../../i18n";
import { primaryNavigation } from "../../data/product-navigation";
import { useSiteContent } from "../../hooks/useSiteContent";
import { MoodToggle } from "../MoodToggle";
import { ThemeToggle } from "../ThemeToggle";
import { PrefetchLink } from "./PrefetchLink";

const LANG_CYCLE = ["en", "zh-CN", "ko", "ja"] as const;
const COMPACT_NAVIGATION_QUERY = "(max-width: 980px)";
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

function getCompactNavigation() {
  return typeof window !== "undefined" && window.matchMedia(COMPACT_NAVIGATION_QUERY).matches;
}

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
  const [compactNavigation, setCompactNavigation] = useState(getCompactNavigation);
  const headerRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const utilityButtonRef = useRef<HTMLButtonElement>(null);
  const utilityMenuRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const { siteConfig } = useSiteContent();
  const location = useLocation();

  const navItems = useMemo(
    () => primaryNavigation.map((item) => ({ ...item, label: t(item.labelKey as never) })),
    [t],
  );

  const isCurrent = (path: string) =>
    path === "/" ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const toggleLang = () => {
    const index = LANG_CYCLE.indexOf(i18n.language as (typeof LANG_CYCLE)[number]);
    const next = LANG_CYCLE[(index + 1) % LANG_CYCLE.length];
    void loadAndChangeLanguage(next);
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

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncNavigationHeight = () => {
      document.documentElement.style.setProperty("--nav-h", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    };
    const observer = new ResizeObserver(syncNavigationHeight);
    observer.observe(header);
    syncNavigationHeight();

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--nav-h");
    };
  }, [scrolled]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_NAVIGATION_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      const activeElement = document.activeElement;
      const focusWasInUtility =
        utilityButtonRef.current === activeElement || utilityMenuRef.current?.contains(activeElement) === true;
      const focusWasInDrawer =
        hamburgerRef.current === activeElement || drawerRef.current?.contains(activeElement) === true;

      setCompactNavigation(event.matches);
      setDrawerOpen(false);
      setUtilityOpen(false);

      if (focusWasInUtility || focusWasInDrawer) {
        window.requestAnimationFrame(() => {
          (event.matches ? hamburgerRef.current : utilityButtonRef.current)?.focus();
        });
      }
    };

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-lock", drawerOpen && compactNavigation);
    return () => document.body.classList.remove("nav-lock");
  }, [compactNavigation, drawerOpen]);

  useEffect(() => {
    setDrawerOpen(false);
    setUtilityOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen || !compactNavigation) return;
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
      const returnTarget = window.matchMedia(COMPACT_NAVIGATION_QUERY).matches
        ? hamburgerRef.current
        : utilityButtonRef.current;
      (returnTarget ?? previouslyFocused)?.focus();
    };
  }, [compactNavigation, drawerOpen]);

  useEffect(() => {
    if (!utilityOpen || compactNavigation) return;
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
  }, [compactNavigation, utilityOpen]);

  const languageLabel = t(`langToggle.languages.${i18n.language}` as never);
  const utilityLabel = t("nav.utilityMenu", "Display and language settings");

  const openChatFromDrawer = () => {
    setDrawerOpen(false);
    window.requestAnimationFrame(onOpenChat);
  };

  return (
    <>
      <header ref={headerRef} className={`site-nav${scrolled ? " is-scrolled" : ""}`}>
        <PrefetchLink className="brand-mark" to="/" aria-label={t("nav.backToHome")}>
          <span className="brand-seal" aria-hidden="true">
            <Camera size={18} />
          </span>
          <span className="brand-copy">
            <strong>{siteConfig.brandName}</strong>
            <small>NHB / VISUAL PLAYGROUND</small>
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
          <button
            className="nav-icon-button nav-command-trigger"
            type="button"
            onClick={openCommandPalette}
            aria-label={t("platform.command.title")}
            title={`${t("platform.command.title")} (Ctrl+K)`}
          >
            <Search size={18} aria-hidden="true" />
            <kbd>⌘K</kbd>
          </button>
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
              }}
            >
              <Settings2 size={18} aria-hidden="true" />
            </button>
            {utilityOpen && !compactNavigation ? (
              <div ref={utilityMenuRef} id="nav-utility-panel" className="nav-popover nav-utility-panel">
                <span className="nav-popover-label">NHB / PREFERENCES</span>
                <UtilityControls onLanguageChange={toggleLang} languageLabel={languageLabel} menuLabel={utilityLabel} />
              </div>
            ) : null}
          </div>

          <PrefetchLink className="nav-cta" to="/create">
            <WandSparkles size={17} aria-hidden="true" />
            {t("nav.create")}
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
        drawerOpen && compactNavigation ? (
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
                  <strong>NHB / VISUAL PLAYGROUND</strong>
                  <small>{siteConfig.city} / PERSONAL VISUAL PRACTICE</small>
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
                <span id="drawer-utility-label" className="nav-popover-label">NHB / PREFERENCES</span>
                <UtilityControls onLanguageChange={toggleLang} languageLabel={languageLabel} menuLabel={utilityLabel} />
              </section>

              <div className="nav-drawer-actions">
                <button type="button" onClick={() => { setDrawerOpen(false); window.requestAnimationFrame(openCommandPalette); }}>
                  <Search size={18} aria-hidden="true" />
                  {t("platform.command.title")}
                </button>
                <PrefetchLink to="/create" onClick={() => setDrawerOpen(false)}>
                  <WandSparkles size={18} aria-hidden="true" />
                  {t("nav.create")}
                </PrefetchLink>
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
