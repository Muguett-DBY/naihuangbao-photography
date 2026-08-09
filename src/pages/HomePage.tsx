import "../styles/home-booking.css";
import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { useBookingModal } from "../features/booking/BookingContext";
import { useSiteContent } from "../hooks/useSiteContent";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { usePageRevealEffects } from "../hooks/usePageRevealEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SectionSkeleton } from "../components/SectionSkeleton";
import { HomeChapterIndex, type HomeChapter } from "../components/shared/HomeChapterIndex";

const Packages = lazy(() => import("../components/Packages").then((module) => ({ default: module.Packages })));

function splitProcessStep(step: string) {
  const [title, detail] = step.split("｜");
  return { title, detail };
}

export function HomePage() {
  const { t } = useTranslation();
  const { siteConfig, sectionCopy, processSteps } = useSiteContent();
  const { photos } = usePublicPhotos();
  const { openBookingModal, warmBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null);

  const publicPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public" && photo.clientAuthorized),
    [photos],
  );
  const heroPhotos = publicPhotos.slice(0, 3);
  const activeHero = heroPhotos.find((photo) => photo.id === activeHeroId) ?? heroPhotos[0];
  const featuredPhotos = publicPhotos.slice(0, 6);
  const finalPhoto = publicPhotos[2] ?? publicPhotos[0];
  const homeChapters = useMemo<HomeChapter[]>(
    () => [
      { id: "premiere", index: "01", label: t("nav.home") },
      { id: "featured", index: "02", label: t("nav.gallery") },
      { id: "packages", index: "03", label: t("nav.packages") },
      { id: "process", index: "04", label: t("process.eyebrow") },
      { id: "book", index: "05", label: t("nav.booking") },
    ],
    [t],
  );

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });
  usePageRevealEffects(rootRef);

  return (
    <PageTransition ref={rootRef} className="home-booking-page">
      <section className="home-booking-hero" id="premiere" aria-labelledby="home-title">
        <div className="home-booking-hero__media">
          {activeHero ? (
            <ImageWithFallback
              src={activeHero.imageUrl}
              alt={activeHero.alt}
              title={activeHero.title}
              priority
              sizes="(max-width: 760px) 100vw, 58vw"
              tone="cream"
            />
          ) : null}
          <div className="home-booking-hero__film-mark" aria-hidden="true">
            <span>01</span>
            <span>{siteConfig.city}</span>
          </div>
        </div>

        <div className="home-booking-hero__copy">
          <p className="home-booking-kicker">{t("hero.brandPrefix")}</p>
          <h1 id="home-title">{siteConfig.brandName}</h1>
          <p className="home-booking-hero__intro">{t("hero.intro")}</p>
          <div className="home-booking-proof" aria-label={t("hero.trustTags.privacy")}>
            <span><ShieldCheck size={16} aria-hidden="true" />{t("hero.trustTags.privacy")}</span>
            <span><CheckCircle2 size={16} aria-hidden="true" />{t("hero.trustTags.guidance")}</span>
            <span><CheckCircle2 size={16} aria-hidden="true" />{t("hero.trustTags.styles")}</span>
          </div>
          <div className="home-booking-actions">
            <button
              type="button"
              className="home-booking-primary"
              onClick={() => openBookingModal()}
              onFocus={warmBookingModal}
              onPointerEnter={warmBookingModal}
            >
              <CalendarCheck size={18} aria-hidden="true" />
              {t("hero.ctaBooking")}
            </button>
            <PrefetchLink to="/gallery" className="home-booking-secondary">
              {t("hero.ctaView")}
              <ArrowRight size={17} aria-hidden="true" />
            </PrefetchLink>
          </div>
        </div>

        {heroPhotos.length > 1 ? (
          <div className="home-booking-hero__selector" role="group" aria-label={t("gallery.title")}>
            {heroPhotos.map((photo, index) => {
              const isActive = photo.id === activeHero?.id;
              return (
                <button
                  key={photo.id}
                  type="button"
                  className={isActive ? "is-active" : undefined}
                  aria-pressed={isActive}
                  aria-label={photo.title}
                  onClick={() => setActiveHeroId(photo.id)}
                >
                  <ImageWithFallback
                    src={photo.imageUrl}
                    alt=""
                    title={photo.title}
                    sizes="88px"
                    tone="cream"
                  />
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <HomeChapterIndex ariaLabel={t("sectionNav.ariaLabel")} chapters={homeChapters} />

      <section className="home-booking-featured" id="featured" aria-labelledby="home-featured-title">
        <header className="home-booking-heading">
          <p>{sectionCopy.gallery.eyebrow}</p>
          <div>
            <h2 id="home-featured-title">{sectionCopy.gallery.title}</h2>
            <span>{sectionCopy.gallery.intro}</span>
          </div>
          <PrefetchLink to="/gallery">
            {t("hero.ctaView")}<ArrowRight size={17} aria-hidden="true" />
          </PrefetchLink>
        </header>
        <div className="home-booking-gallery">
          {featuredPhotos.map((photo, index) => (
            <PrefetchLink key={photo.id} to={`/gallery/${photo.id}`} className={`home-booking-photo home-booking-photo--${index + 1}`}>
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                sizes="(max-width: 760px) 88vw, (max-width: 1100px) 44vw, 30vw"
                tone="cream"
              />
              <span>
                <small>{photo.location}</small>
                <strong>{photo.title}</strong>
              </span>
            </PrefetchLink>
          ))}
        </div>
      </section>

      <div className="home-booking-packages">
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasCards={3} />}>
            <Packages />
          </Suspense>
        </ErrorBoundary>
      </div>

      <section className="home-booking-process" id="process" aria-labelledby="home-process-title">
        <header className="home-booking-heading">
          <p>{sectionCopy.notice.eyebrow}</p>
          <div>
            <h2 id="home-process-title">{sectionCopy.notice.title}</h2>
            <span>{sectionCopy.notice.intro}</span>
          </div>
        </header>
        <ol className="home-booking-process__steps">
          {processSteps.map((step, index) => {
            const { title, detail } = splitProcessStep(step);
            return (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3>{detail ? <p>{detail}</p> : null}</div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="home-booking-final" id="book" aria-labelledby="home-book-title" data-motion-group>
        <div className="home-booking-final__media" data-motion-item>
          {finalPhoto ? (
            <ImageWithFallback
              src={finalPhoto.imageUrl}
              alt={finalPhoto.alt}
              title={finalPhoto.title}
              sizes="(max-width: 760px) 100vw, 52vw"
              tone="cream"
            />
          ) : null}
        </div>
        <div className="home-booking-final__copy" data-motion-item>
          <p>{sectionCopy.midCta.eyebrow}</p>
          <h2 id="home-book-title">{sectionCopy.midCta.title}</h2>
          <span>{sectionCopy.midCta.intro}</span>
          <button
            type="button"
            onClick={() => openBookingModal()}
            onFocus={warmBookingModal}
            onPointerEnter={warmBookingModal}
          >
            <CalendarCheck size={18} aria-hidden="true" />
            {sectionCopy.midCta.actionLabel}
          </button>
        </div>
      </section>
    </PageTransition>
  );
}
