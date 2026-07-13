import "../styles/pages.css";
import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { List, Map as MapIcon } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SectionSkeleton } from "../components/SectionSkeleton";

const PhotoMap = lazy(() => import("../components/PhotoMap").then((m) => ({ default: m.PhotoMap })));

export function MapPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { photos } = usePublicPhotos();
  const [view, setView] = useState<"map" | "list">("map");

  useGsapPageEffects(rootRef);
  useSEO({ titleKey: "seo.mapTitle", descKey: "seo.mapDesc", path: "/map" });

  const { locations, zoneStats } = useMemo(() => {
    const locationMap = new globalThis.Map<string, { name: string; count: number; styles: Set<string> }>();
    const zones = { free: 0, fee: 0 };

    for (const photo of photos) {
      if (!photo.location) continue;
      const current = locationMap.get(photo.location) ?? {
        name: photo.location,
        count: 0,
        styles: new Set<string>(),
      };
      current.count += 1;
      if (photo.style) current.styles.add(photo.style);
      locationMap.set(photo.location, current);
      if (photo.location.includes("南京")) zones.free += 1;
      else zones.fee += 1;
    }

    return {
      locations: Array.from(locationMap.values()).map((location) => ({
        ...location,
        styles: Array.from(location.styles),
      })),
      zoneStats: zones,
    };
  }, [photos]);

  return (
    <PageTransition ref={rootRef} className="map-page map-page--editorial">
      <PageHero
        eyebrow={t("photoMap.eyebrow")}
        title={t("photoMap.title")}
        subtitle={t("photoMap.intro")}
        image="/images/gallery/gallery-urban-01.webp"
        imageAlt={t("photoMap.heroImageAlt")}
        issue="FIELD NOTES 09"
      />

      <section className="section-shell map-page-workspace is-visible">
        <div className="map-page-toolbar" role="group" aria-label={t("photoMap.viewModeLabel")}>
          <button
            type="button"
            className={`map-view-btn ${view === "map" ? "active" : ""}`}
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
          >
            <MapIcon size={17} aria-hidden="true" /> {t("photoMap.mapView")}
          </button>
          <button
            type="button"
            className={`map-view-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <List size={17} aria-hidden="true" /> {t("photoMap.listView")}
          </button>
        </div>

        <dl className="map-stats-bar" aria-label={t("photoMap.coverageSummary")}>
          <div className="map-stat"><dt>{t("photoMap.totalPhotos")}</dt><dd>{photos.length}</dd></div>
          <div className="map-stat"><dt>{t("photoMap.locations")}</dt><dd>{locations.length}</dd></div>
          <div className="map-stat map-stat-free"><dt>{t("photoMap.freeZone")}</dt><dd>{zoneStats.free}</dd></div>
          <div className="map-stat map-stat-fee"><dt>{t("photoMap.feeZone")}</dt><dd>{zoneStats.fee}</dd></div>
        </dl>

        <ErrorBoundary>
        {view === "map" ? (
          <Suspense fallback={<SectionSkeleton hasImage lines={2} />}>
            <PhotoMap showHeading={false} />
          </Suspense>
        ) : (
          <ul className="map-location-list" aria-label={t("photoMap.locationListLabel")}>
            {locations.map((loc) => (
              <li key={loc.name} className="map-location-card">
                <h3>{loc.name}</h3>
                <span className="map-location-count">{loc.count} {t("photoMap.photos")}</span>
                <div className="map-location-styles">
                  {loc.styles.map((s) => (
                    <span key={s} className="map-location-style">{t(`gallery.filters.${s}`, s)}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
