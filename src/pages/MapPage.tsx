import "../styles/pages.css";
import { Suspense, lazy, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Map, List } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { PageTransition } from "../components/shared/PageTransition";
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

  const locations = Array.from(new Set(photos.map((p) => p.location))).map((loc) => ({
    name: loc,
    count: photos.filter((p) => p.location === loc).length,
    styles: Array.from(new Set(photos.filter((p) => p.location === loc).map((p) => p.style))),
  }));

  const zoneStats = (() => {
    const zones = { free: 0, fee: 0, unreachable: 0 };
    photos.forEach((p) => {
      if (p.location.includes("南京")) zones.free++;
      else if (p.location) zones.fee++;
    });
    return zones;
  })();

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
        <div className="map-view-toggle">
          <button type="button" className={`map-view-btn ${view === "map" ? "active" : ""}`} onClick={() => setView("map")}>
            <Map size={16} /> {t("photoMap.mapView", "Map")}
          </button>
          <button type="button" className={`map-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
            <List size={16} /> {t("photoMap.listView", "List")}
          </button>
        </div>

        <ErrorBoundary>
        {view === "map" ? (
          <Suspense fallback={<SectionSkeleton hasImage lines={2} />}>
            <PhotoMap />
          </Suspense>
        ) : (
          <div className="map-location-list">
            <div className="map-stats-bar">
              <span className="map-stat"><strong>{photos.length}</strong> {t("photoMap.totalPhotos", "total photos")}</span>
              <span className="map-stat"><strong>{locations.length}</strong> {t("photoMap.locations", "locations")}</span>
              <span className="map-stat map-stat-free">{t("photoMap.freeZone", "Free")}: <strong>{zoneStats.free}</strong></span>
              <span className="map-stat map-stat-fee">{t("photoMap.feeZone", "Fee")}: <strong>{zoneStats.fee}</strong></span>
            </div>
            {locations.map((loc) => (
              <div key={loc.name} className="map-location-card">
                <h3>{loc.name}</h3>
                <span className="map-location-count">{loc.count} {t("photoMap.photos", "photos")}</span>
                <div className="map-location-styles">
                  {loc.styles.map((s) => (
                    <span key={s} className="map-location-style">{t(`gallery.filters.${s}`, s)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
