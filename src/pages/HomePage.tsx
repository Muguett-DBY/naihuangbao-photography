import "../styles/pages.css";
import "../styles/home-premiere.css";
import { Suspense, lazy, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import { useBookingModal } from "../features/booking/BookingContext";
import { useSiteContent } from "../hooks/useSiteContent";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useDeferredRender } from "../hooks/useDeferredRender";
import { usePageRevealEffects } from "../hooks/usePageRevealEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PhotoOfTheDay } from "../components/PhotoOfTheDay";
import { RecentlyViewedStrip } from "../components/RecentlyViewedStrip";
import { SectionSkeleton } from "../components/SectionSkeleton";
import { ServiceJournal } from "../components/ServiceJournal";
import { CinematicPremiere } from "../components/CinematicPremiere";
import { conceptPremiereImmersiveFrames } from "../data/concept-premiere";
import { useImmersiveAnchor } from "../experience/useImmersiveAnchor";
import { OpticalSceneChrome } from "../components/shared/OpticalSceneChrome";
import { HomeChapterIndex, type HomeChapter } from "../components/shared/HomeChapterIndex";

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
  const { openBookingModal, warmBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const { photos } = usePublicPhotos();
  const galleryRender = useDeferredRender<HTMLElement>();
  const whyRender = useDeferredRender<HTMLDivElement>();
  const reviewsRender = useDeferredRender<HTMLDivElement>();
  const quizRender = useDeferredRender<HTMLElement>();

  const coverPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, 3),
    [photos],
  );
  const immersiveImages = useMemo(() => {
    const conceptImages = conceptPremiereImmersiveFrames.slice(0, 2).map((frame) => frame.imageUrl);
    const photoImages = coverPhotos.map((photo) => photo.imageUrl);
    return [
      ...conceptImages,
      ...photoImages,
    ].filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  }, [coverPhotos]);
  const immersiveHeroRef = useImmersiveAnchor({
    id: "home-hero",
    preset: "home",
    imageUrls: immersiveImages,
  });
  const finalCtaPhoto = coverPhotos[2] ?? coverPhotos[0];
  const homeChapters = useMemo<HomeChapter[]>(
    () => [
      { id: "premiere", index: "00", label: t("premiere.chapter") },
      { id: "field-notes", index: "01", label: t("filmstrip.title" as never) },
      { id: "featured", index: "02", label: t("gallery.title") },
      { id: "services-preview", index: "03", label: t("home.servicesTitle") },
      { id: "style-finder", index: "04", label: t("home.styleQuizTitle") },
      { id: "book", index: "05", label: t("midCTA.cta") },
    ],
    [t],
  );

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });
  usePageRevealEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <section
        ref={immersiveHeroRef}
        className="hero hero-home"
        id="premiere"
        data-immersive-anchor="home"
      >
        <CinematicPremiere />
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
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 42vw"
              />
            </div>
          ))}
        </div>
        <div className="hero-solid-scrim" aria-hidden="true" />
        <OpticalSceneChrome preset="home" chapter="01" />

        <div className="hero-editorial-copy">
          <p className="hero-concept-label">
            <span>{t("premiere.label")}</span>
            <span>{t("premiere.disclosure")}</span>
          </p>
          <p className="hero-issue-line">
            <span>{t("hero.volBadge")}</span>
            <span>{siteConfig.city}</span>
            <span>2026</span>
          </p>
          <h1 className="hero-title" data-premiere-title>{siteConfig.brandName}</h1>
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
              onFocus={warmBookingModal}
              onPointerDown={warmBookingModal}
              onPointerEnter={warmBookingModal}
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

      <HomeChapterIndex ariaLabel={t("nav.home")} chapters={homeChapters} />

      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={3} hasImage />}>
          <FilmStripStory />
        </Suspense>
      </ErrorBoundary>

      <div className="home-editorial-band home-editorial-band--paper">
        <PhotoOfTheDay />
      </div>

      <RecentlyViewedStrip />

      <section
        ref={galleryRender.ref}
        className="home-editorial-band home-editorial-band--gallery"
        id="featured"
        data-chapter="02"
        data-deferred-ready={galleryRender.ready}
      >
        <header className="home-band-heading" data-motion-group>
          <p className="home-band-index" data-motion-item>02 / {t("gallery.eyebrow")}</p>
          <div data-motion-item>
            <h2>{t("gallery.title")}</h2>
            <p>{t("gallery.description")}</p>
          </div>
        </header>
        {galleryRender.ready ? (
          <ErrorBoundary>
            <Suspense fallback={<SectionSkeleton hasCards={3} />}>
              <Gallery />
            </Suspense>
          </ErrorBoundary>
        ) : <SectionSkeleton hasCards={3} />}
        <div className="home-band-action">
          <PrefetchLink to="/gallery" className="home-page-link">
            {t("hero.ctaView")} <ArrowRight size={17} aria-hidden="true" />
          </PrefetchLink>
        </div>
      </section>

      <section className="home-editorial-band home-editorial-band--services" id="services-preview" data-chapter="03">
        <header className="home-band-heading" data-motion-group>
          <p className="home-band-index" data-motion-item>03 / {t("home.servicesTitle")}</p>
          <div data-motion-item>
            <h2>{t("home.servicesTitle")}</h2>
            <p>{t("hero.intro")}</p>
          </div>
        </header>
        <ServiceJournal />
      </section>

      <div
        ref={whyRender.ref}
        className="home-editorial-band home-editorial-band--why"
        data-deferred-ready={whyRender.ready}
      >
        {whyRender.ready ? (
          <ErrorBoundary>
            <Suspense fallback={<SectionSkeleton hasCards={3} />}>
              <WhyChooseUs />
            </Suspense>
          </ErrorBoundary>
        ) : <SectionSkeleton hasCards={3} />}
      </div>

      <div
        ref={reviewsRender.ref}
        className="home-deferred-reviews"
        data-deferred-ready={reviewsRender.ready}
      >
        {reviewsRender.ready ? (
          <ErrorBoundary>
            <Suspense fallback={<SectionSkeleton lines={4} />}>
              <Reviews />
            </Suspense>
          </ErrorBoundary>
        ) : <SectionSkeleton lines={4} />}
      </div>

      <section
        ref={quizRender.ref}
        className="home-editorial-band home-editorial-band--quiz"
        id="style-finder"
        data-chapter="04"
        data-deferred-ready={quizRender.ready}
      >
        <header className="home-band-heading home-band-heading--light" data-motion-group>
          <p className="home-band-index" data-motion-item>04 / {t("home.styleQuizTitle")}</p>
          <div data-motion-item>
            <h2>{t("home.styleQuizTitle")}</h2>
            <p>{t("quiz.result.desc")}</p>
          </div>
        </header>
        {quizRender.ready ? (
          <ErrorBoundary>
            <Suspense fallback={<SectionSkeleton lines={3} />}>
              <StyleQuiz showPreview />
            </Suspense>
          </ErrorBoundary>
        ) : <SectionSkeleton lines={3} />}
      </section>

      <section className="home-final-cta" id="book" data-motion-group>
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
          <button
            type="button"
            className="home-final-cta-button"
            onClick={() => openBookingModal()}
            onFocus={warmBookingModal}
            onPointerEnter={warmBookingModal}
          >
            <CalendarCheck size={18} aria-hidden="true" />
            {t("midCTA.cta")}
          </button>
        </div>
      </section>
    </PageTransition>
  );
}
