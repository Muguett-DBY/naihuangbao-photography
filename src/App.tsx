import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useRef, useState } from "react";
import { useGsapAnimations } from "./hooks/useGsapAnimations";
import { CanvasParticles } from "./components/CanvasParticles";
import { SectionNav } from "./components/SectionNav";
import { AboutBooking } from "./components/AboutBooking";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CustomCursor } from "./components/CustomCursor";
import { FilmGrain } from "./components/FilmGrain";
import { LoadingScreen } from "./components/LoadingScreen";
import { Footer } from "./components/Footer";
import { FloatingBookingCta } from "./components/FloatingBookingCta";
import { Gallery } from "./components/Gallery";
import { ScrollStory } from "./components/ScrollStory";
import { Hero } from "./components/Hero";
import { MidCTA } from "./components/MidCTA";
import { NotFound } from "./components/NotFound";
import { Packages } from "./components/Packages";
import { PolaroidWall } from "./components/PolaroidWall";
import { ProcessAndFaq } from "./components/ProcessAndFaq";
import { Reviews } from "./components/Reviews";
import { PublicChatLauncher } from "./components/PublicChatLauncher";
import { ServiceDetails } from "./components/ServiceDetails";
import { SiteNav } from "./components/SiteNav";
import { WhyChooseUs } from "./components/WhyChooseUs";
import { PublicPhotosProvider } from "./hooks/usePublicPhotos";
import { SiteContentProvider } from "./hooks/useSiteContent";
import { BookingProvider } from "./hooks/useBookingModal";

const HorizontalGallery = lazy(() => import("./components/HorizontalGallery").then((m) => ({ default: m.HorizontalGallery })));
const PhotoWall3D = lazy(() => import("./components/PhotoWall3D").then((m) => ({ default: m.PhotoWall3D })));
const PhotoMap = lazy(() => import("./components/PhotoMap").then((m) => ({ default: m.PhotoMap })));

const AdminDashboard = lazy(async () => {
  await import("./styles/admin.css");
  return import("./components/AdminDashboard");
});
const PublicChatWidget = lazy(() => import("./components/PublicChatWidget"));

function AdminRoute() {
  return (
    <Suspense fallback={<div className="adm-root"><div className="adm-loading">加载中...</div></div>}>
      <AdminDashboard />
    </Suspense>
  );
}

function isNotFound(): boolean {
  const path = window.location.pathname;
  if (path === "/" || path === "/admin" || path.startsWith("/admin/")) return false;
  return true;
}

export function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  if (window.location.pathname.startsWith("/admin")) {
    return (
      <ErrorBoundary>
        <AdminRoute />
      </ErrorBoundary>
    );
  }

  if (isNotFound()) {
    return <NotFound />;
  }

  useGsapAnimations(rootRef);

  return (
    <ErrorBoundary>
      <LoadingScreen />
      <FilmGrain />
      <CustomCursor />
      <div ref={rootRef}>
      <BookingProvider>
      <SiteContentProvider>
        <PublicPhotosProvider>
          <div className="scroll-progress-bar" role="progressbar" aria-label="页面阅读进度" />
          <CanvasParticles />
          <SectionNav />
          <a className="skip-link" href="#main-content">
            跳过导航，直接查看内容
          </a>
          <SiteNav />
          <motion.main
            id="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Hero />
            <Suspense fallback={<div style={{height:'min(60vh, 480px)'}} />}>
              <PhotoWall3D />
            </Suspense>
            <ScrollStory />
            <Suspense fallback={<div className="section-shell" style={{minHeight:200}} />}>
              <HorizontalGallery />
            </Suspense>
            <PolaroidWall />
            <Gallery />
            <Suspense fallback={<div style={{height:'min(55vh, 440px)'}} />}>
              <PhotoMap />
            </Suspense>
            <MidCTA />
            <WhyChooseUs />
            <Packages />
            <ServiceDetails />
            <Reviews />
            <ProcessAndFaq />
            <AboutBooking />
          </motion.main>
          <Footer />
          <FloatingBookingCta />
          <div className={`public-chat-widget${chatOpen ? " is-open" : ""}`}>
            <PublicChatLauncher open={chatOpen} onToggle={() => setChatOpen((value) => !value)} />
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
    </ErrorBoundary>
  );
}
