import { Suspense, lazy, useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PublicChatLauncher } from "../components/PublicChatLauncher";
import { PublicPhotosProvider } from "../hooks/usePublicPhotos";
import { SiteContentProvider } from "../hooks/useSiteContent";
import { BookingProvider } from "../hooks/useBookingModal";
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

// Heavy visual effects and animations are split into a separate chunk
// so the initial bundle only ships React + i18n + router. These activate
// on idle so the page can paint and become interactive first.
const GlobalEffects = lazy(() => import("../components/GlobalEffects"));

const PublicChatWidget = lazy(() => import("../components/PublicChatWidget"));
const OfflineBookingRecovery = lazy(() => import("../components/OfflineBookingRecovery"));

export function RootLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const isOnline = useOnlineStatus();

  const handleSkipClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const main = document.getElementById("main-content");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus();
      main.removeAttribute("tabindex");
    }
  }, []);

  const isEditor = location.pathname === "/editor";
  const showPublicChat = !isEditor;

  return (
    <div className={isEditor ? "site-shell is-editor" : "site-shell"}>
      <OfflineFallback isOffline={!isOnline} />
      <PwaUpdateBanner />
      <RouteHashScroller />
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
                target.setAttribute("tabindex", "-1");
                target.focus();
                target.removeAttribute("tabindex");
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
            if (target) {
              target.setAttribute("tabindex", "-1");
              target.focus();
              target.removeAttribute("tabindex");
            }
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
              <ToastProvider>
                <Header onOpenChat={() => setChatOpen(true)} />
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
                  <div className={`public-chat-widget${chatOpen ? " is-open" : ""}`}>
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
            </PublicPhotosProvider>
          </SiteContentProvider>
        </BookingProvider>
      </AuthProvider>
    </div>
  );
}
