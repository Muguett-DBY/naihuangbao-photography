import "../styles/pages.css";
import { Suspense, lazy, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSiteContent } from "../hooks/useSiteContent";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PhotoOfTheDay } from "../components/PhotoOfTheDay";
import { RecentlyViewedStrip } from "../components/RecentlyViewedStrip";
import { SectionSkeleton } from "../components/SectionSkeleton";
import { ServiceJournal } from "../components/ServiceJournal";
import { useImmersiveAnchor } from "../experience/useImmersiveAnchor";
import { OpticalSceneChrome } from "../components/shared/OpticalSceneChrome";

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
  const { photos } = usePublicPhotos();

  const coverPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, 3),
    [photos],
  );
  const immersiveImages = useMemo(() => coverPhotos.map((photo) => photo.imageUrl), [coverPhotos]);
  const immersiveHeroRef = useImmersiveAnchor({
    id: "home-hero",
    preset: "home",
    imageUrls: immersiveImages,
  });
  const finalCtaPhoto = coverPhotos[2] ?? coverPhotos[0];

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });
  useGsapPageEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <section
        ref={immersiveHeroRef}
        className="hero hero-home"
        id="top"
        data-immersive-anchor="home"
      >
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
        <OpticalSceneChrome preset="home" chapter="01" />

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

      </section>

      <nav className="home-index-strip" aria-label={t("nav.home")}>
        <a href="#field-notes"><span>01</span><strong>{t("filmstrip.title" as never)}</strong></a>
        <a href="#featured"><span>02</span><strong>{t("gallery.title")}</strong></a>
        <a href="#services-preview"><span>03</span><strong>{t("home.servicesTitle")}</strong></a>
        <a href="#style-finder"><span>04</span><strong>{t("home.styleQuizTitle")}</strong></a>
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
        <ServiceJournal />
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
            <StyleQuiz showPreview />
          </Suspense>
        </ErrorBoundary>
      </section>

      <section className="home-final-cta" data-motion-group>
        <div className="home-final-cta-media" data-motion-item>
          {finalCtaPhoto ? (
            <ImageWithFallback
              src={finalCtaPhoto.imageUrl}
              alt={finalCtaPhoto.alt}
              title={finalCtaPhoto.title}
              tone="ink"
              sizes="100vw"
            />
          ) : null}
          <span aria-hidden="true" />
        </div>
        <div className="home-final-cta-content" data-motion-item>
          <p className="home-band-index">05 / {t("midCTA.cta")}</p>
          <div>
            <h2>{t("midCTA.title")}</h2>
            <p>{t("midCTA.desc")}</p>
          </div>
          <button type="button" className="home-final-cta-button" onClick={() => openBookingModal()}>
            <CalendarCheck size={18} aria-hidden="true" />
            {t("midCTA.cta")}
          </button>
        </div>
      </section>
    </PageTransition>
  );
}
