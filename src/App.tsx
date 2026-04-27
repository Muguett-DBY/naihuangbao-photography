import { AboutBooking } from "./components/AboutBooking";
import { AdminDashboard } from "./components/AdminDashboard";
import { Footer } from "./components/Footer";
import { Gallery } from "./components/Gallery";
import { Hero } from "./components/Hero";
import { MidCTA } from "./components/MidCTA";
import { Packages } from "./components/Packages";
import { ProcessAndFaq } from "./components/ProcessAndFaq";
import { ServiceDetails } from "./components/ServiceDetails";
import { SiteNav } from "./components/SiteNav";
import { WhyChooseUs } from "./components/WhyChooseUs";

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
        <MidCTA />
        <WhyChooseUs />
        <Packages />
        <ServiceDetails />
        <ProcessAndFaq />
        <AboutBooking />
      </main>
      <Footer />
    </>
  );
}
