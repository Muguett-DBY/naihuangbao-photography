import "../styles/pages.css";
import { Suspense, lazy, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";

const PhotoMap = lazy(() => import("../components/PhotoMap").then((m) => ({ default: m.PhotoMap })));

export function MapPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);

  useGsapPageEffects(rootRef);
  useSEO({ titleKey: "seo.mapTitle", descKey: "seo.mapDesc", path: "/map" });

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)", minHeight: "auto", paddingBottom: 40 }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">{t("photoMap.eyebrow")}</p>
          <h1>{t("photoMap.title")}</h1>
          <span>{t("photoMap.intro")}</span>
        </div>
      </section>

      <section className="section-shell" style={{ padding: "0 0 60px" }}>
        <ErrorBoundary>
        <Suspense fallback={<div style={{ height: "min(60vh, 500px)", background: "#f0e8e0", borderRadius: 16 }} />}>
          <PhotoMap />
        </Suspense>
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
