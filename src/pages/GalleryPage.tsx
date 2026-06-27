import "../styles/pages.css";
import { Suspense, lazy, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SectionSkeleton } from "../components/SectionSkeleton";

const Gallery = lazy(() => import("../components/Gallery").then((m) => ({ default: m.Gallery })));
const PhotoWall3DCss = lazy(() => import("../components/PhotoWall3DCss").then((m) => ({ default: m.PhotoWall3DCss })));
const HorizontalGallery = lazy(() => import("../components/HorizontalGallery").then((m) => ({ default: m.HorizontalGallery })));
const PolaroidWall = lazy(() => import("../components/PolaroidWall").then((m) => ({ default: m.PolaroidWall })));
const PhotoMap = lazy(() => import("../components/PhotoMap").then((m) => ({ default: m.PhotoMap })));

const GALLERY_SCROLL_KEY = "nhb-gallery-scroll-position";

export function GalleryPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);

  useSEO({ titleKey: "seo.galleryTitle", descKey: "seo.galleryDesc", path: "/gallery" });
  useGsapPageEffects(rootRef);

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
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">{t("gallery.eyebrow")}</p>
          <h1>{t("gallery.title")}</h1>
          <span>{t("gallery.description")}</span>
        </div>
      </section>

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

      <section className="section-shell is-visible">
        <ErrorBoundary>
          <Gallery />
        </ErrorBoundary>
      </section>

      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton hasImage lines={2} />}>
          <PhotoMap />
        </Suspense>
      </ErrorBoundary>
    </PageTransition>
  );
}
