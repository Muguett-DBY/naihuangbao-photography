import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { SiteContentProvider } from "../hooks/useSiteContent";
import { Header } from "../components/shared/Header";
import { Footer } from "../components/shared/Footer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ToastProvider } from "../components/shared/Toast";
import { ScrollToTop } from "../components/shared/ScrollToTop";
import { MobileBottomNav } from "../components/shared/MobileBottomNav";
import { PwaInstallBanner } from "../components/PwaInstallBanner";
import { PwaUpdateBanner } from "../components/PwaUpdateBanner";
import { OfflineFallback } from "../components/OfflineFallback";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { RouteHashScroller } from "../components/shared/RouteHashScroller";
import { RouteLoadingState } from "../components/shared/RouteLoadingState";
import { ImmersiveExperienceGate } from "../experience/ImmersiveExperienceGate";
import { ExperienceProvider, useExperienceStore } from "../experience/ExperienceProvider";
import { resolveRoutePreset } from "../experience/scene-presets";
import { OPEN_COMMAND_PALETTE_EVENT } from "../lib/command-palette";
import { RouteExperienceTelemetry } from "../components/shared/RouteExperienceTelemetry";
import { RouteIndexingPolicy } from "../components/shared/RouteIndexingPolicy";
import { WorkspaceProjectProvider } from "../hooks/useWorkspaceProjects";

// Optional cursor and texture effects stay in a separate chunk so the page
// can paint and become interactive without coupling them to route code.
const GlobalEffects = lazy(() => import("../components/GlobalEffects"));
const CommandPalette = lazy(() => import("../components/CommandPalette").then((module) => ({ default: module.CommandPalette })));
const ProjectDock = lazy(() => import("../components/ProjectDock").then((module) => ({ default: module.ProjectDock })));
const AdaptiveQualityGovernor = lazy(() => import("../experience/AdaptiveQualityGovernor").then((module) => ({ default: module.AdaptiveQualityGovernor })));

function DeferredCommandPalette() {
  const [requested, setRequested] = useState(false);

  useLayoutEffect(() => {
    const requestPalette = () => setRequested(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        requestPalette();
      }
    };
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, requestPalette);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, requestPalette);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return requested ? (
    <Suspense fallback={null}>
      <CommandPalette initiallyOpen />
    </Suspense>
  ) : null;
}

function focusWithTemporaryTabIndex(target: HTMLElement) {
  const hadTabIndex = target.hasAttribute("tabindex");
  if (!hadTabIndex) target.setAttribute("tabindex", "-1");
  target.focus();
  if (!hadTabIndex) {
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
}

function ExperienceStateBridge({ pathname }: { pathname: string }) {
  const store = useExperienceStore();

  useEffect(() => {
    store.setRoute(resolveRoutePreset(pathname));
  }, [pathname, store]);

  useEffect(() => {
    const publishVisibility = () => store.setVisible(document.visibilityState === "visible");
    publishVisibility();
    document.addEventListener("visibilitychange", publishVisibility);
    return () => document.removeEventListener("visibilitychange", publishVisibility);
  }, [store]);

  return null;
}

export function RootLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  const handleSkipClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const main = document.getElementById("main-content");
    if (main) focusWithTemporaryTabIndex(main);
  }, []);

  const isEditor = location.pathname === "/editor";
  const isCreativeWorkspace = isEditor || location.pathname === "/create" || location.pathname.startsWith("/create/") || location.pathname === "/studio";
  const routePreset = resolveRoutePreset(location.pathname);

  return (
    <div className={isEditor ? "site-shell is-editor" : "site-shell"}>
      <OfflineFallback isOffline={!isOnline} />
      <PwaUpdateBanner />
      <RouteHashScroller />
      <RouteIndexingPolicy />
      <RouteExperienceTelemetry pathname={location.pathname} />
      <Suspense fallback={null}><AdaptiveQualityGovernor /></Suspense>
      <nav className="skip-links" aria-label={t("common.skipLinksLabel", "Skip links")}>
        <a
          href="#main-content"
          className="skip-link"
          onClick={handleSkipClick}
        >
          {t("common.skipToContent", "跳转到内容")}
        </a>
        <a
          href="#site-navigation-menu"
          className="skip-link skip-link--secondary"
          onClick={(e) => {
            e.preventDefault();
            const drawerNavigation = document.getElementById("site-navigation-menu");
            const hamburger = document.querySelector<HTMLElement>(".hamburger");
            const inlineNavigation = document.querySelector<HTMLElement>(".nav-menu--inline");
            const hamburgerIsVisible = hamburger !== null && window.getComputedStyle(hamburger).display !== "none";
            const target = drawerNavigation ?? (hamburgerIsVisible ? hamburger : inlineNavigation);
            if (target) {
              const focusable = target.matches("a[href], button:not([disabled])")
                ? target
                : target.querySelector<HTMLElement>("a[href], button:not([disabled])");
              if (focusable) {
                focusable.focus();
              } else {
                focusWithTemporaryTabIndex(target);
              }
            }
          }}
        >
          {t("common.skipToNav", "跳转到导航")}
        </a>
        <a
          href="#site-footer"
          className="skip-link skip-link--secondary"
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById("site-footer");
            if (target) focusWithTemporaryTabIndex(target);
          }}
        >
          {t("common.skipToFooter", "跳转到页脚")}
        </a>
      </nav>
      {!isCreativeWorkspace && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <GlobalEffects />
          </Suspense>
        </ErrorBoundary>
      )}
      <SiteContentProvider>
        <ExperienceProvider>
                <ExperienceStateBridge pathname={location.pathname} />
                {routePreset && location.pathname !== "/" && <ImmersiveExperienceGate />}
                <WorkspaceProjectProvider>
                  <ToastProvider>
                    <Header />
                    <DeferredCommandPalette />
                    <main id="main-content" aria-label={t("common.mainContentLabel", "Main content")}>
                      <ErrorBoundary>
                        <Suspense fallback={<RouteLoadingState />}>
                          <Outlet />
                        </Suspense>
                      </ErrorBoundary>
                    </main>
                    <Footer />
                    <Suspense fallback={null}><ProjectDock /></Suspense>
                    {!isCreativeWorkspace && <MobileBottomNav />}
                    <ScrollToTop />
                    <PwaInstallBanner />
                  </ToastProvider>
                </WorkspaceProjectProvider>
        </ExperienceProvider>
      </SiteContentProvider>
    </div>
  );
}
