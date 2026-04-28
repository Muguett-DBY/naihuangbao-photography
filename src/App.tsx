import { lazy, Suspense } from "react";
import { AboutBooking } from "./components/AboutBooking";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Gallery } from "./components/Gallery";
import { Hero } from "./components/Hero";
import { MidCTA } from "./components/MidCTA";
import { NotFound } from "./components/NotFound";
import { Packages } from "./components/Packages";
import { ProcessAndFaq } from "./components/ProcessAndFaq";
import { ServiceDetails } from "./components/ServiceDetails";
import { SiteNav } from "./components/SiteNav";
import { WhyChooseUs } from "./components/WhyChooseUs";
import { PublicPhotosProvider } from "./hooks/usePublicPhotos";
import { SiteContentProvider } from "./hooks/useSiteContent";

const AdminDashboard = lazy(async () => {
  await import("./styles/admin.css");
  return import("./components/AdminDashboard");
});

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

  return (
    <ErrorBoundary>
      <SiteContentProvider>
        <PublicPhotosProvider>
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
        </PublicPhotosProvider>
      </SiteContentProvider>
    </ErrorBoundary>
  );
}
