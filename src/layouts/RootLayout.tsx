import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGsapGlobalEffects } from "../hooks/useGsapGlobalEffects";
import { CustomCursor } from "../components/CustomCursor";
import { FilmGrain } from "../components/FilmGrain";
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
import { ScrollProgress } from "../components/ScrollProgress";

export function RootLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useGsapGlobalEffects(rootRef);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
    <div ref={rootRef} className={isEditor ? "site-shell is-editor" : "site-shell"}>
      {!isEditor && <ScrollProgress />}
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
      {location.pathname !== "/editor" && (
        <>
          <ErrorBoundary fallback={null}>
            <FilmGrain />
          </ErrorBoundary>
          <ErrorBoundary fallback={null}>
            <CustomCursor />
          </ErrorBoundary>
        </>
      )}
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
              </ToastProvider>
            </PublicPhotosProvider>
          </SiteContentProvider>
        </BookingProvider>
      </AuthProvider>
    </div>
  );
}

const PublicChatWidget = lazy(() => import("../components/PublicChatWidget"));
