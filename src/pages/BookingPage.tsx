import "../styles/pages.css";
import { Suspense, lazy, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck } from "lucide-react";
import { usePageRevealEffects } from "../hooks/usePageRevealEffects";
import { useSEO } from "../hooks/useSEO";
import { useBookingModal } from "../features/booking/BookingContext";
import { track } from "../utils/track";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SectionSkeleton } from "../components/SectionSkeleton";
import { opticalArchiveById } from "../data/optical-archive";

const Packages = lazy(() => import("../components/Packages").then((m) => ({ default: m.Packages })));
const ServiceDetails = lazy(() => import("../components/ServiceDetails").then((m) => ({ default: m.ServiceDetails })));
const ProcessAndFaq = lazy(() => import("../components/ProcessAndFaq").then((m) => ({ default: m.ProcessAndFaq })));
const StyleQuiz = lazy(() => import("../components/StyleQuiz").then((m) => ({ default: m.StyleQuiz })));
const BOOKING_IMMERSIVE_IMAGES = [
  opticalArchiveById["booking-table"].imageUrl,
  opticalArchiveById["camellia-prism"].imageUrl,
  opticalArchiveById["bamboo-shadow"].imageUrl,
];

export function BookingPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { openBookingModal, warmBookingModal } = useBookingModal();

  useSEO({ titleKey: "seo.bookingTitle", descKey: "seo.bookingDesc", path: "/booking" });
  usePageRevealEffects(rootRef);
  useEffect(() => {
    track("booking_page_view");
    warmBookingModal();
  }, [warmBookingModal]);

  return (
    <PageTransition ref={rootRef} className="booking-page booking-page--editorial">
      <PageHero
        eyebrow={t("packages.eyebrow")}
        title={t("nav.booking")}
        subtitle={t("aboutBooking.desc")}
        image={opticalArchiveById["booking-table"].imageUrl}
        imageAlt={t(opticalArchiveById["booking-table"].altKey as never)}
        issue={t("bookingPage.issue")}
        immersivePreset="booking"
        immersiveImages={BOOKING_IMMERSIVE_IMAGES}
      />

      <section className="section-shell booking-conversion-band is-visible">
        <div className="booking-quick-cta">
          <ol className="booking-page-flow" aria-label={t("bookingModal.stepNavigation")}>
            {[
              t("bookingModal.selectPackage"),
              `${t("bookingModal.date")} / ${t("bookingModal.time")}`,
              t("bookingModal.contact"),
              t("payment.title"),
              t("bookingModal.successTitle"),
            ].map((label, index) => (
              <li key={label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{label}</strong>
              </li>
            ))}
          </ol>
          <div className="booking-quick-cta-inner">
            <span className="booking-quick-marker">{t("bookingPage.deskMarker")}</span>
            <h2>{t("bookingPage.readyTitle")}</h2>
            <p>{t("bookingPage.readyDesc")}</p>
            <button
              type="button"
              className="booking-quick-cta-btn"
              onPointerEnter={warmBookingModal}
              onFocus={warmBookingModal}
              onTouchStart={warmBookingModal}
              onClick={() => openBookingModal()}
            >
              <CalendarCheck size={18} aria-hidden="true" />
              {t("bookingPage.startBooking")}
            </button>
          </div>
        </div>
      </section>

      <div className="booking-content-surface">
        <div className="booking-content-ledger" aria-hidden="true">
          <span>{t("bookingPage.configurator")}</span>
          <span>{t("bookingPage.notes")}</span>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton lines={3} />}>
            <StyleQuiz showPreview deferPreview />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasCards={3} />}>
            <Packages />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasCards={3} />}>
            <ServiceDetails />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton lines={6} />}>
            <ProcessAndFaq />
          </Suspense>
        </ErrorBoundary>
      </div>
    </PageTransition>
  );
}
