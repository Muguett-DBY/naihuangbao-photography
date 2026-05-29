import { Suspense, lazy, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";

const Gallery = lazy(() => import("../components/Gallery").then((m) => ({ default: m.Gallery })));
const PhotoWall3D = lazy(() => import("../components/PhotoWall3D").then((m) => ({ default: m.PhotoWall3D })));
const HorizontalGallery = lazy(() => import("../components/HorizontalGallery").then((m) => ({ default: m.HorizontalGallery })));
const PolaroidWall = lazy(() => import("../components/PolaroidWall").then((m) => ({ default: m.PolaroidWall })));
const PhotoMap = lazy(() => import("../components/PhotoMap").then((m) => ({ default: m.PhotoMap })));

export function GalleryPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);

  useSEO({ titleKey: "seo.galleryTitle", descKey: "seo.galleryDesc", path: "/gallery" });
  useGsapPageEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">Portfolio</p>
          <h1>{t("gallery.title")}</h1>
          <span>{t("gallery.description")}</span>
        </div>
      </section>

      <ErrorBoundary>
        <Suspense fallback={<div style={{ height: "min(60vh, 480px)" }} />}>
          <PhotoWall3D />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 200 }} />}>
          <HorizontalGallery />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div className="section-shell is-visible" style={{ minHeight: 200 }} />}>
          <PolaroidWall />
        </Suspense>
      </ErrorBoundary>

      <section className="section-shell is-visible" id="gallery">
        <ErrorBoundary>
          <Gallery />
        </ErrorBoundary>
      </section>

      <ErrorBoundary>
        <Suspense fallback={<div style={{ height: "min(55vh, 440px)" }} />}>
          <PhotoMap />
        </Suspense>
      </ErrorBoundary>
    </PageTransition>
  );
}
