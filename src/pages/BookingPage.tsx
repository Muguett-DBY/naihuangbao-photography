import { Suspense, lazy, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useBookingModal } from "../hooks/useBookingModal";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";

const Packages = lazy(() => import("../components/Packages").then((m) => ({ default: m.Packages })));
const ServiceDetails = lazy(() => import("../components/ServiceDetails").then((m) => ({ default: m.ServiceDetails })));
const ProcessAndFaq = lazy(() => import("../components/ProcessAndFaq").then((m) => ({ default: m.ProcessAndFaq })));
const StyleQuiz = lazy(() => import("../components/StyleQuiz").then((m) => ({ default: m.StyleQuiz })));

export function BookingPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBookingModal();

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

      <section className="section-shell is-visible">
        <div className="booking-quick-cta">
          <div className="booking-quick-cta-inner">
            <h2>{t("bookingPage.readyTitle", "准备好开始了吗？")}</h2>
            <p>{t("bookingPage.readyDesc", "选择适合你的拍摄套餐，立即预约你的专属拍摄时间。")}</p>
            <button type="button" className="booking-quick-cta-btn" onClick={() => openBookingModal()}>
              <CalendarCheck size={18} />
              {t("bookingPage.startBooking", "立即预约")}
            </button>
          </div>
        </div>
      </section>

      <ErrorBoundary>
        <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
          <StyleQuiz />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
          <Packages />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
          <ServiceDetails />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 300 }} />}>
          <ProcessAndFaq />
        </Suspense>
      </ErrorBoundary>
    </PageTransition>
  );
}
