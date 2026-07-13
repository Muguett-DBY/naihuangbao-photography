import "../styles/pages.css";
import { Suspense, lazy, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Camera,
  Download,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSiteContent } from "../hooks/useSiteContent";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSEO } from "../hooks/useSEO";
import { useReveal } from "../hooks/useReveal";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PhotoOfTheDay } from "../components/PhotoOfTheDay";
import { RecentlyViewedStrip } from "../components/RecentlyViewedStrip";
import { SectionSkeleton } from "../components/SectionSkeleton";

const Gallery = lazy(() => import("../components/Gallery").then((module) => ({ default: module.Gallery })));
const WhyChooseUs = lazy(() => import("../components/WhyChooseUs").then((module) => ({ default: module.WhyChooseUs })));
const Reviews = lazy(() => import("../components/Reviews").then((module) => ({ default: module.Reviews })));
const FilmStripStory = lazy(() =>
  import("../components/FilmStripStory").then((module) => ({ default: module.FilmStripStory })),
);
const StyleQuiz = lazy(() => import("../components/StyleQuiz").then((module) => ({ default: module.StyleQuiz })));

export function HomePage() {
  const { t } = useTranslation();
  const { siteConfig } = useSiteContent();
  const { openBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const servicesRef = useReveal<HTMLDivElement>();
  const { photos } = usePublicPhotos();

  const coverPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, 3),
    [photos],
  );

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });

  return (
    <PageTransition ref={rootRef}>
      <section className="hero hero-home" id="top">
        <div className="hero-contact-sheet">
          {coverPhotos.map((photo, index) => (
            <div
              className={`hero-contact-sheet-frame hero-contact-sheet-frame--${index + 1}`}
              key={photo.id}
            >
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                tone="ink"
                priority={index === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 42vw"
              />
            </div>
          ))}
        </div>
        <div className="hero-solid-scrim" aria-hidden="true" />

        <div className="hero-editorial-copy">
          <p className="hero-issue-line">
            <span>{t("hero.volBadge")}</span>
            <span>{siteConfig.city}</span>
            <span>2026</span>
          </p>
          <h1 className="hero-title">{siteConfig.brandName}</h1>
          <p className="hero-field-note">{t("hero.brandPrefix")}</p>
          <p className="hero-intro">{t("hero.intro")}</p>

          <div className="hero-proof-line" aria-label={t("hero.trustTags.privacy")}>
            <span><ShieldCheck size={15} aria-hidden="true" />{t("hero.trustTags.privacy")}</span>
            <span>{t("hero.trustTags.guidance")}</span>
            <span>{t("hero.trustTags.styles")}</span>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="hero-cover-primary-btn"
              onClick={() => openBookingModal()}
            >
              <CalendarCheck size={18} aria-hidden="true" />
              {t("hero.ctaBooking")}
            </button>
            <PrefetchLink to="/gallery" className="hero-gallery-link">
              {t("hero.ctaView")}
              <ArrowRight size={18} aria-hidden="true" />
            </PrefetchLink>
          </div>
        </div>

        <p className="hero-folio" aria-hidden="true">01 / 06</p>
      </section>

      <nav className="home-index-strip" aria-label={t("nav.home")}>
        <a href="#field-notes"><span>01</span>{t("filmstrip.title" as never)}</a>
        <a href="#featured"><span>02</span>{t("gallery.title")}</a>
        <a href="#services-preview"><span>03</span>{t("home.servicesTitle")}</a>
        <a href="#style-finder"><span>04</span>{t("home.styleQuizTitle")}</a>
      </nav>

      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={3} hasImage />}>
          <FilmStripStory />
        </Suspense>
      </ErrorBoundary>

      <div className="home-editorial-band home-editorial-band--paper">
        <PhotoOfTheDay />
      </div>

      <RecentlyViewedStrip />

      <section className="home-editorial-band home-editorial-band--gallery" id="featured">
        <header className="home-band-heading">
          <p className="home-band-index">02 / {t("gallery.eyebrow")}</p>
          <div>
            <h2>{t("gallery.title")}</h2>
            <p>{t("gallery.description")}</p>
          </div>
        </header>
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasCards={3} />}>
            <Gallery />
          </Suspense>
        </ErrorBoundary>
        <div className="home-band-action">
          <PrefetchLink to="/gallery" className="home-page-link">
            {t("hero.ctaView")} <ArrowRight size={17} aria-hidden="true" />
          </PrefetchLink>
        </div>
      </section>

      <section className="home-editorial-band home-editorial-band--services" id="services-preview">
        <header className="home-band-heading">
          <p className="home-band-index">03 / {t("home.servicesTitle")}</p>
          <div>
            <h2>{t("home.servicesTitle")}</h2>
            <p>{t("hero.intro")}</p>
          </div>
        </header>
        <div className="home-services-grid" ref={servicesRef}>
          <PrefetchLink to="/courses" className="home-service-card">
            <BookOpen size={25} aria-hidden="true" />
            <span className="home-service-number">01</span>
            <h3>{t("nav.courses")}</h3>
            <p>{t("courses.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={15} /></span>
          </PrefetchLink>
          <PrefetchLink to="/products" className="home-service-card">
            <Download size={25} aria-hidden="true" />
            <span className="home-service-number">02</span>
            <h3>{t("nav.presets")}</h3>
            <p>{t("presets.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={15} /></span>
          </PrefetchLink>
          <PrefetchLink to="/workshops" className="home-service-card">
            <MapPinned size={25} aria-hidden="true" />
            <span className="home-service-number">03</span>
            <h3>{t("nav.workshops")}</h3>
            <p>{t("workshops.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={15} /></span>
          </PrefetchLink>
          <PrefetchLink to="/shop" className="home-service-card">
            <Camera size={25} aria-hidden="true" />
            <span className="home-service-number">04</span>
            <h3>{t("nav.shop")}</h3>
            <p>{t("merchandise.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={15} /></span>
          </PrefetchLink>
        </div>
      </section>

      <div className="home-editorial-band home-editorial-band--why">
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasCards={3} />}>
            <WhyChooseUs />
          </Suspense>
        </ErrorBoundary>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={4} />}>
          <Reviews />
        </Suspense>
      </ErrorBoundary>

      <section className="home-editorial-band home-editorial-band--quiz" id="style-finder">
        <header className="home-band-heading home-band-heading--light">
          <p className="home-band-index">04 / {t("home.styleQuizTitle")}</p>
          <div>
            <h2>{t("home.styleQuizTitle")}</h2>
            <p>{t("quiz.result.desc")}</p>
          </div>
        </header>
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton lines={3} />}>
            <StyleQuiz />
          </Suspense>
        </ErrorBoundary>
      </section>

      <section className="home-editorial-band home-final-cta">
        <p className="home-band-index">05 / {t("midCTA.cta")}</p>
        <div>
          <h2>{t("midCTA.title")}</h2>
          <p>{t("midCTA.desc")}</p>
        </div>
        <button type="button" className="home-final-cta-button" onClick={() => openBookingModal()}>
          <CalendarCheck size={18} aria-hidden="true" />
          {t("midCTA.cta")}
        </button>
      </section>
    </PageTransition>
  );
}
