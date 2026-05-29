import { Suspense, lazy, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";

const Packages = lazy(() => import("../components/Packages").then((m) => ({ default: m.Packages })));
const ServiceDetails = lazy(() => import("../components/ServiceDetails").then((m) => ({ default: m.ServiceDetails })));
const ProcessAndFaq = lazy(() => import("../components/ProcessAndFaq").then((m) => ({ default: m.ProcessAndFaq })));
const StyleQuiz = lazy(() => import("../components/StyleQuiz").then((m) => ({ default: m.StyleQuiz })));

export function BookingPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);

  useSEO({ titleKey: "seo.bookingTitle", descKey: "seo.bookingDesc", path: "/booking" });
  useGsapPageEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">{t("packages.eyebrow")}</p>
          <h1>{t("nav.booking")}</h1>
          <span>{t("aboutBooking.desc")}</span>
        </div>
      </section>

      <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
        <StyleQuiz />
      </Suspense>

      <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
        <Packages />
      </Suspense>

      <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
        <ServiceDetails />
      </Suspense>

      <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
        <ProcessAndFaq />
      </Suspense>
    </PageTransition>
  );
}
