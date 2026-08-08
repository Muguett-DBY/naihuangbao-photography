import "../styles/home-premiere.css";
import "../styles/platform-v4.css";
import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpenText,
  CalendarCheck,
  Layers3,
  ShieldCheck,
  WandSparkles,
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
import { opticalGardenFrames } from "../data/optical-archive";
import { useImmersiveAnchor } from "../experience/useImmersiveAnchor";
import { OpticalSceneChrome } from "../components/shared/OpticalSceneChrome";
import { HomeChapterIndex, type HomeChapter } from "../components/shared/HomeChapterIndex";
import { SoftMagnet } from "../components/shared/SoftMagnet";
import { scheduleIdleTask } from "../lib/idle";
import { VisualLightTable } from "../components/VisualLightTable";

const Gallery = lazy(() => import("../components/Gallery").then((module) => ({ default: module.Gallery })));
const WhyChooseUs = lazy(() => import("../components/WhyChooseUs").then((module) => ({ default: module.WhyChooseUs })));
const Reviews = lazy(() => import("../components/Reviews").then((module) => ({ default: module.Reviews })));
const FilmStripStory = lazy(() =>
  import("../components/FilmStripStory").then((module) => ({ default: module.FilmStripStory })),
);
const StyleQuiz = lazy(() => import("../components/StyleQuiz").then((module) => ({ default: module.StyleQuiz })));
const RainLetterPremiere = lazy(() => import("../components/RainLetterPremiere").then((module) => ({
  default: module.RainLetterPremiere,
})));

function useDeferredHomePageStyles() {
  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      cancelIdle();
      window.clearTimeout(deadline);
      window.removeEventListener("scroll", start);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      void import("../styles/pages.css").catch(() => undefined);
    };

    const cancelIdle = scheduleIdleTask(start, 0);
    const deadline = window.setTimeout(start, 120);
    window.addEventListener("scroll", start, { passive: true, once: true });
    window.addEventListener("pointerdown", start, { passive: true, once: true });
    window.addEventListener("keydown", start, { once: true });

    return () => {
      cancelIdle();
      window.clearTimeout(deadline);
      window.removeEventListener("scroll", start);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);
}

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
    const conceptImages = opticalGardenFrames.slice(0, 3).map((frame) => frame.imageUrl);
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
      { id: "premiere", index: "00", label: t("opticalArchive.chapter") },
      { id: "light-table", index: "01", label: t("platform.playground.lightTable", "光桌") },
      { id: "rain-letter", index: "02", label: t("rainLetter.chapter") },
      { id: "field-notes", index: "03", label: t("filmstrip.title" as never) },
      { id: "featured", index: "04", label: t("gallery.title") },
      { id: "services-preview", index: "05", label: t("home.servicesTitle") },
      { id: "style-finder", index: "06", label: t("home.styleQuizTitle") },
      { id: "book", index: "07", label: t("midCTA.cta") },
    ],
    [t],
  );

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });
  usePageRevealEffects(rootRef);
  useDeferredHomePageStyles();

  return (
    <PageTransition ref={rootRef}>
      <section
        ref={immersiveHeroRef}
        className="hero hero-home"
        id="premiere"
        data-immersive-anchor="home"
        data-optical-garden="true"
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
            <span>{t("opticalArchive.label")}</span>
            <span>{t("premiere.disclosure")}</span>
          </p>
          <div className="mood-signature" aria-live="polite">
            <span className="mood-signature__magazine">NHB / SOFT CINEMA EDITION</span>
            <span className="mood-signature__cute">NHB / LITTLE PHOTO DIARY</span>
          </div>
          <p className="hero-issue-line">
            <span>{t("hero.volBadge")}</span>
            <span>{siteConfig.city}</span>
            <span>2026</span>
          </p>
          <h1 className="hero-title" data-premiere-title>{siteConfig.brandName}</h1>
          <p className="hero-field-note">NHB / PERSONAL VISUAL PLAYGROUND</p>
          <p className="hero-intro">{t("platform.playground.intro", "一个关于光、颜色、纸张与本地创作工具的个人视觉实验场。")}</p>

          <div className="hero-proof-line" aria-label={t("platform.playground.local", "本地优先")}>
            <span><ShieldCheck size={15} aria-hidden="true" />{t("platform.playground.local", "本地优先")}</span>
            <span>{t("platform.playground.archive", "持续生长的视觉档案")}</span>
            <span>{t("platform.playground.practice", "为实验而制作")}</span>
          </div>

          <div className="hero-actions">
            <SoftMagnet strength={12}>
              <PrefetchLink to="/create" className="hero-create-primary">
                <WandSparkles size={18} aria-hidden="true" />
                {t("platform.playground.startCreating", "开始创作")}
              </PrefetchLink>
            </SoftMagnet>
            <SoftMagnet strength={12}>
              <button
                type="button"
                className="hero-cover-primary-btn"
                onClick={() => openBookingModal()}
                onFocus={warmBookingModal}
                onPointerDown={warmBookingModal}
                onPointerEnter={warmBookingModal}
              >
                <CalendarCheck size={18} aria-hidden="true" />
                {t("platform.playground.bookingDemo", "预约流程实验")}
              </button>
            </SoftMagnet>
            <SoftMagnet strength={8}>
              <PrefetchLink to="/gallery" className="hero-gallery-link">
                {t("hero.ctaView")}
                <ArrowRight size={18} aria-hidden="true" />
              </PrefetchLink>
            </SoftMagnet>
          </div>
        </div>

      </section>

      <HomeChapterIndex ariaLabel={t("nav.home")} chapters={homeChapters} />

      <VisualLightTable />

      <section className="home-playground-portals" aria-labelledby="home-playground-portals-title">
        <header>
          <span className="platform-index">02 / EXPLORE · MAKE · READ</span>
          <div><h2 id="home-playground-portals-title">从一张画面进入完整系统</h2><p>浏览概念档案、打开本地创作工具，或阅读每个实验背后的选择。</p></div>
        </header>
        <div>
          <PrefetchLink to="/archive">
            <ImageWithFallback src="/images/optical-archive/paper-water-lab-v1.webp" alt="" title={t("nav.archive")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><Layers3 size={21} aria-hidden="true" /><small>EXPLORE</small><strong>{t("nav.archive")}</strong><p>沿着天气、颜色和材质探索概念项目。</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
          <PrefetchLink to="/create">
            <ImageWithFallback src="/images/optical-archive/print-room-morning-v2.webp" alt="" title={t("nav.create")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><WandSparkles size={21} aria-hidden="true" /><small>MAKE</small><strong>{t("nav.create")}</strong><p>排版、调色、保存并导出自己的视觉项目。</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
          <PrefetchLink to="/stories">
            <ImageWithFallback src="/images/optical-archive/rain-observation-room-v1.webp" alt="" title={t("nav.stories")} sizes="(max-width: 760px) 100vw, 34vw" />
            <span><BookOpenText size={21} aria-hidden="true" /><small>READ</small><strong>{t("nav.stories")}</strong><p>阅读画面、过程和小型技术实验笔记。</p></span>
            <ArrowRight size={19} aria-hidden="true" />
          </PrefetchLink>
        </div>
      </section>

      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={3} hasImage />}>
          <RainLetterPremiere />
        </Suspense>
      </ErrorBoundary>

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
          <p className="home-band-index" data-motion-item>03 / {t("gallery.eyebrow")}</p>
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

      <section className="home-editorial-band home-editorial-band--services" id="services-preview" data-chapter="04">
        <header className="home-band-heading" data-motion-group>
          <p className="home-band-index" data-motion-item>04 / {t("home.servicesTitle")}</p>
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
        data-chapter="05"
        data-deferred-ready={quizRender.ready}
      >
        <header className="home-band-heading home-band-heading--light" data-motion-group>
          <p className="home-band-index" data-motion-item>05 / {t("home.styleQuizTitle")}</p>
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
          <p className="home-band-index">06 / {t("midCTA.cta")}</p>
          <div>
            <h2>{t("midCTA.title")}</h2>
            <p>{t("midCTA.desc")}</p>
          </div>
          <SoftMagnet strength={12}>
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
          </SoftMagnet>
        </div>
      </section>
    </PageTransition>
  );
}
