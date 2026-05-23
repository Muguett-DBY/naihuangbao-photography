import { lazy, Suspense, useRef, useState } from "react";
import { useGsapAnimations } from "./hooks/useGsapAnimations";
import { CustomCursor } from "./components/CustomCursor";
import { CanvasParticles } from "./components/CanvasParticles";
import { AboutBooking } from "./components/AboutBooking";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { FloatingBookingCta } from "./components/FloatingBookingCta";
import { Gallery } from "./components/Gallery";
import { Hero } from "./components/Hero";
import { MidCTA } from "./components/MidCTA";
import { NotFound } from "./components/NotFound";
import { Packages } from "./components/Packages";
import { ProcessAndFaq } from "./components/ProcessAndFaq";
import { PublicChatLauncher } from "./components/PublicChatLauncher";
import { ServiceDetails } from "./components/ServiceDetails";
import { SiteNav } from "./components/SiteNav";
import { WhyChooseUs } from "./components/WhyChooseUs";
import { PublicPhotosProvider } from "./hooks/usePublicPhotos";
import { SiteContentProvider } from "./hooks/useSiteContent";

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
      <div ref={rootRef}>
      <SiteContentProvider>
        <PublicPhotosProvider>
          <div className="scroll-progress-bar" role="progressbar" aria-label="页面阅读进度" />
          <CustomCursor />
          <CanvasParticles />
          <a className="skip-link" href="#main-content">
            跳过导航，直接查看内容
          </a>
          <SiteNav />
          <main id="main-content">
            <Hero />
            <Gallery />
            <MidCTA />
            <WhyChooseUs />
            <Packages />
            <ServiceDetails />
            <ProcessAndFaq />
            <AboutBooking />
          </main>
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
      </div>
    </ErrorBoundary>
  );
}
