import "../styles/pages.css";
import { Suspense, lazy, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { SectionSkeleton } from "../components/SectionSkeleton";

const Gallery = lazy(() => import("../components/Gallery").then((m) => ({ default: m.Gallery })));
const PhotoWall3DCss = lazy(() => import("../components/PhotoWall3DCss").then((m) => ({ default: m.PhotoWall3DCss })));
const HorizontalGallery = lazy(() => import("../components/HorizontalGallery").then((m) => ({ default: m.HorizontalGallery })));
const PolaroidWall = lazy(() => import("../components/PolaroidWall").then((m) => ({ default: m.PolaroidWall })));
const PhotoMap = lazy(() => import("../components/PhotoMap").then((m) => ({ default: m.PhotoMap })));

const GALLERY_SCROLL_KEY = "nhb-gallery-scroll-position";

export function GalleryPage() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();
  const { siteConfig } = useSiteContent();
  const rootRef = useRef<HTMLDivElement>(null);

  useSEO({ titleKey: "seo.galleryTitle", descKey: "seo.galleryDesc", path: "/gallery" });

  // Restore scroll position on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(GALLERY_SCROLL_KEY);
      if (saved) {
        sessionStorage.removeItem(GALLERY_SCROLL_KEY);
        requestAnimationFrame(() => {
          window.scrollTo({ top: parseInt(saved, 10), behavior: "instant" });
        });
      }
    } catch { /* ignore */ }
  }, []);

  // Save scroll position on unmount (navigation away)
  useEffect(() => {
    return () => {
      try {
        const y = window.scrollY;
        if (y > 100) {
          sessionStorage.setItem(GALLERY_SCROLL_KEY, String(y));
        }
      } catch { /* ignore */ }
    };
  }, []);

  return (
    <PageTransition ref={rootRef}>
      <section className="gallery-page-hero" id="top">
        <div className="gallery-page-contact-sheet">
          {photos.filter((photo) => photo.visibility === "public").slice(0, 3).map((photo, index) => (
            <div className={`gallery-page-cover gallery-page-cover--${index + 1}`} key={photo.id}>
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                tone="ink"
                priority={index === 0}
                sizes="(max-width: 640px) 100vw, 45vw"
              />
            </div>
          ))}
        </div>
        <div className="gallery-page-hero-scrim" aria-hidden="true" />
        <div className="gallery-page-hero-copy">
          <p className="section-eyebrow">{t("gallery.eyebrow")} / {siteConfig.city}</p>
          <h1>{t("gallery.title")}</h1>
          <p>{t("gallery.description")}</p>
          <a href="#gallery-archive" className="gallery-page-jump">01 / {t("gallery.title")}</a>
        </div>
      </section>

      <section className="gallery-page-archive" id="gallery-archive">
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasCards={3} />}>
            <Gallery />
          </Suspense>
        </ErrorBoundary>
      </section>

      <div className="gallery-page-stories">
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasImage />}>
            <PhotoWall3DCss />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton lines={2} hasImage />}>
            <HorizontalGallery />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton lines={2} hasImage />}>
            <PolaroidWall />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasImage lines={2} />}>
            <PhotoMap />
          </Suspense>
        </ErrorBoundary>
      </div>
    </PageTransition>
  );
}
