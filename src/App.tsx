import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Hero } from "./components/Hero";
import { NotFound } from "./components/NotFound";
import { PublicChatLauncher } from "./components/PublicChatLauncher";
import { SiteNav } from "./components/SiteNav";
import { PublicPhotosProvider } from "./hooks/usePublicPhotos";
import { SiteContentProvider } from "./hooks/useSiteContent";
import { BookingProvider } from "./hooks/useBookingModal";

const HorizontalGallery = lazy(() => import("./components/HorizontalGallery").then((m) => ({ default: m.HorizontalGallery })));
const PhotoWall3D = lazy(() => import("./components/PhotoWall3D").then((m) => ({ default: m.PhotoWall3D })));
const PhotoMap = lazy(() => import("./components/PhotoMap").then((m) => ({ default: m.PhotoMap })));
const ScrollStory = lazy(() => import("./components/ScrollStory").then((m) => ({ default: m.ScrollStory })));
const PolaroidWall = lazy(() => import("./components/PolaroidWall").then((m) => ({ default: m.PolaroidWall })));
const MidCTA = lazy(() => import("./components/MidCTA").then((m) => ({ default: m.MidCTA })));
const WhyChooseUs = lazy(() => import("./components/WhyChooseUs").then((m) => ({ default: m.WhyChooseUs })));
const Packages = lazy(() => import("./components/Packages").then((m) => ({ default: m.Packages })));
const ServiceDetails = lazy(() => import("./components/ServiceDetails").then((m) => ({ default: m.ServiceDetails })));
const Reviews = lazy(() => import("./components/Reviews").then((m) => ({ default: m.Reviews })));
const ProcessAndFaq = lazy(() => import("./components/ProcessAndFaq").then((m) => ({ default: m.ProcessAndFaq })));

const AdminDashboard = lazy(async () => {
  await import("./styles/admin.css");
  return import("./components/AdminDashboard");
});
const PublicChatWidget = lazy(() => import("./components/PublicChatWidget"));

function AdminRoute() {
  const { t: tAdmin } = useTranslation();
  return (
    <Suspense fallback={<div className="adm-root"><div className="adm-loading">{tAdmin("loading")}</div></div>}>
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
  const { t } = useTranslation();
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
          <div className="scroll-progress-bar" role="progressbar" aria-label={t("loading")} />
          <CanvasParticles />
          <SectionNav />
          <a className="skip-link" href="#main-content">
            {t("nav.skipLink")}
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
            <Suspense fallback={<div style={{height:'100vh'}} />}>
              <ScrollStory />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:200}} />}>
              <HorizontalGallery />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:200}} />}>
              <PolaroidWall />
            </Suspense>
            <Gallery />
            <Suspense fallback={<div style={{height:'min(55vh, 440px)'}} />}>
              <PhotoMap />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:300}} />}>
              <MidCTA />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:300}} />}>
              <WhyChooseUs />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:300}} />}>
              <Packages />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:300}} />}>
              <ServiceDetails />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:300}} />}>
              <Reviews />
            </Suspense>
            <Suspense fallback={<div className="section-shell" style={{minHeight:200}} />}>
              <ProcessAndFaq />
            </Suspense>
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
                  {t("loading")}
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
