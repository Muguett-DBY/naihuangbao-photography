import { Suspense, lazy, useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "../components/LoadingScreen";
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
import { PushNotificationBanner } from "../components/PushNotificationBanner";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { RouteHashScroller } from "../components/shared/RouteHashScroller";

// Heavy visual effects and animations are split into a separate chunk
// so the initial bundle only ships React + i18n + router. These activate
// on idle so the page can paint and become interactive first.
const GlobalEffects = lazy(() => import("../components/GlobalEffects"));

const PublicChatWidget = lazy(() => import("../components/PublicChatWidget"));

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
            const target = document.getElementById("site-navigation-menu");
            if (target) {
              const focusable = target.querySelector<HTMLElement>("a[href]");
              (focusable ?? target).setAttribute("tabindex", "-1");
              (focusable ?? target).focus();
              (focusable ?? target).removeAttribute("tabindex");
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
      <LoadingScreen />
      {!isEditor && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <GlobalEffects />
          </Suspense>
        </ErrorBoundary>
      )}
      {!isEditor && <PushNotificationBanner />}
      <AuthProvider>
        <BookingProvider>
          <SiteContentProvider>
            <PublicPhotosProvider>
              <ToastProvider>
              <Header />
              <main id="main-content" aria-label={t("common.mainContentLabel", "Main content")}>
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
                    <Outlet />
                  </Suspense>
                </ErrorBoundary>
              </main>
              <Footer />
              {!isEditor && <MobileBottomNav />}
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
