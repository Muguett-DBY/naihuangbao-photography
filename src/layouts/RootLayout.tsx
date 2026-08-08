import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { PublicChatLauncher } from "../components/PublicChatLauncher";
import { PublicPhotosProvider } from "../hooks/usePublicPhotos";
import { SiteContentProvider } from "../hooks/useSiteContent";
import { useBookingModal } from "../features/booking/BookingContext";
import { BookingProvider } from "../features/booking/BookingProvider";
import { AuthProvider } from "../hooks/useAuth";
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
import { useExperiencePause } from "../experience/useExperiencePause";
import { resolveRoutePreset } from "../experience/scene-presets";
import { OPEN_COMMAND_PALETTE_EVENT } from "../lib/command-palette";
import { RouteExperienceTelemetry } from "../components/shared/RouteExperienceTelemetry";

// Optional cursor and texture effects stay in a separate chunk so the page
// can paint and become interactive without coupling them to route code.
const GlobalEffects = lazy(() => import("../components/GlobalEffects"));
const CommandPalette = lazy(() => import("../components/CommandPalette").then((module) => ({ default: module.CommandPalette })));

const PublicChatWidget = lazy(() => import("../components/PublicChatWidget"));
const OfflineBookingRecovery = lazy(() => import("../components/OfflineBookingRecovery"));

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

function ExperienceStateBridge({ pathname, chatOpen }: {
  pathname: string;
  chatOpen: boolean;
}) {
  const store = useExperienceStore();
  const { isBookingOpen } = useBookingModal();
  useExperiencePause("chat", chatOpen);
  useExperiencePause("booking", isBookingOpen);

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
  const [chatOpen, setChatOpen] = useState(false);
  const isOnline = useOnlineStatus();

  const handleSkipClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const main = document.getElementById("main-content");
    if (main) focusWithTemporaryTabIndex(main);
  }, []);

  const isEditor = location.pathname === "/editor";
  const isCreativeWorkspace = isEditor || ["/create", "/studio"].includes(location.pathname);
  const showPublicChat = !isCreativeWorkspace;
  const routePreset = resolveRoutePreset(location.pathname);

  return (
    <div className={isEditor ? "site-shell is-editor" : "site-shell"}>
      <OfflineFallback isOffline={!isOnline} />
      <PwaUpdateBanner />
      <RouteHashScroller />
      <RouteExperienceTelemetry pathname={location.pathname} />
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
      {!isEditor && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <GlobalEffects />
          </Suspense>
        </ErrorBoundary>
      )}
      <AuthProvider>
        <BookingProvider>
          <SiteContentProvider>
            <PublicPhotosProvider>
              <ExperienceProvider>
                <ExperienceStateBridge pathname={location.pathname} chatOpen={chatOpen} />
                {routePreset && <ImmersiveExperienceGate />}
                <ToastProvider>
                  <Header onOpenChat={() => setChatOpen(true)} />
                  <DeferredCommandPalette />
                  {!isEditor && (
                    <Suspense fallback={null}>
                      <OfflineBookingRecovery isOnline={isOnline} />
                    </Suspense>
                  )}
                  <main id="main-content" aria-label={t("common.mainContentLabel", "Main content")}>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoadingState />}>
                        <Outlet />
                      </Suspense>
                    </ErrorBoundary>
                  </main>
                  {showPublicChat && (
                    <div className={`public-chat-widget${location.pathname === "/" ? " is-home" : ""}${chatOpen ? " is-open" : ""}`}>
                      <PublicChatLauncher open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
                      {chatOpen ? (
                        <Suspense
                          fallback={
                            <div className="public-chat-panel public-chat-panel-loading" role="status" aria-live="polite">
                              {t("common.loading")}
                            </div>
                          }
                        >
                          <PublicChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
                        </Suspense>
                      ) : null}
                    </div>
                  )}
                  <Footer />
                  {!isEditor && <MobileBottomNav />}
                  <ScrollToTop />
                  <PwaInstallBanner />
                </ToastProvider>
              </ExperienceProvider>
            </PublicPhotosProvider>
          </SiteContentProvider>
        </BookingProvider>
      </AuthProvider>
    </div>
  );
}
