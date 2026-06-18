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
    <div ref={rootRef} className={isEditor ? "is-editor" : undefined}>
      <a
        href="#main-content"
        className="skip-link"
        onClick={handleSkipClick}
      >
        {t("common.skipToContent", "跳转到内容")}
      </a>
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
              <main id="main-content">
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
                    <Outlet />
                  </Suspense>
                </ErrorBoundary>
              </main>
              <Footer />
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
