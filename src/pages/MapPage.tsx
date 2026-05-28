import { Suspense, lazy, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";

const PhotoMap = lazy(() => import("../components/PhotoMap").then((m) => ({ default: m.PhotoMap })));

export function MapPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);

  useGsapPageEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)", minHeight: "auto", paddingBottom: 40 }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">Service Area</p>
          <h1>{t("photoMap.title")}</h1>
          <span>{t("photoMap.intro")}</span>
        </div>
      </section>

      <section className="section-shell is-visible" style={{ padding: "0 0 60px" }}>
        <Suspense fallback={<div style={{ height: "min(60vh, 500px)", background: "#f0e8e0", borderRadius: 16 }} />}>
          <PhotoMap />
        </Suspense>
      </section>
    </PageTransition>
  );
}
