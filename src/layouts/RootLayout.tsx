import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useGsapGlobalEffects } from "../hooks/useGsapGlobalEffects";
import { CustomCursor } from "../components/CustomCursor";
import { FilmGrain } from "../components/FilmGrain";
import { LoadingScreen } from "../components/LoadingScreen";
import { PublicChatLauncher } from "../components/PublicChatLauncher";
import { PublicPhotosProvider } from "../hooks/usePublicPhotos";
import { SiteContentProvider } from "../hooks/useSiteContent";
import { BookingProvider } from "../hooks/useBookingModal";
import { Header } from "../components/shared/Header";
import { Footer } from "../components/shared/Footer";

export function RootLayout() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useGsapGlobalEffects(rootRef);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div ref={rootRef}>
      <LoadingScreen />
      <FilmGrain />
      <CustomCursor />
      <BookingProvider>
        <SiteContentProvider>
          <PublicPhotosProvider>
            <Header />
            <AnimatePresence mode="wait">
              <motion.main
                key={location.pathname}
                id="main-content"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
                  <Outlet />
                </Suspense>
              </motion.main>
            </AnimatePresence>
            <Footer />
            <div className={`public-chat-widget${chatOpen ? " is-open" : ""}`}>
              <PublicChatLauncher open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
              {chatOpen ? (
                <Suspense
                  fallback={
                    <div className="public-chat-panel public-chat-panel-loading" role="status" aria-live="polite">
                      加载中...
                    </div>
                  }
                >
                  <PublicChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
                </Suspense>
              ) : null}
            </div>
          </PublicPhotosProvider>
        </SiteContentProvider>
      </BookingProvider>
    </div>
  );
}

const PublicChatWidget = lazy(() => import("../components/PublicChatWidget"));
