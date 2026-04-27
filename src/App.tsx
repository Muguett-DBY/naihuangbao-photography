import { AboutBooking } from "./components/AboutBooking";
import { AdminDashboard } from "./components/AdminDashboard";
import { Footer } from "./components/Footer";
import { Gallery } from "./components/Gallery";
import { Hero } from "./components/Hero";
import { Packages } from "./components/Packages";
import { ProcessAndFaq } from "./components/ProcessAndFaq";
import { SiteNav } from "./components/SiteNav";

export function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminDashboard />;
  }

  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Gallery />
        <Packages />
        <ProcessAndFaq />
        <AboutBooking />
      </main>
      <Footer />
    </>
  );
}
