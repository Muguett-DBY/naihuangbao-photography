import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMapEvents, useMap } from "react-leaflet";
import L, { Icon, divIcon } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { CustomMarker } from "./CustomMarker";
import { LocationSearch } from "./LocationSearch";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/* ══════════════════════════════════════════════
   Studio Center — 南京审计大学金审学院 / 仙林大学城
   ══════════════════════════════════════════════ */
const STUDIO_CENTER: [number, number] = [32.106, 118.922];
const FREE_RADIUS = 2; // km — no travel fee
const MAX_RADIUS = 10; // km — can reach (with fee)
const DEG_PER_KM = 0.009; // approximate at Nanjing latitude (111km/°)

/* ══════════════════════════════════════════════
   Zone calculation
   ══════════════════════════════════════════════ */
interface LocationInfo {
  coords: [number, number];
  distance: number;
  zone: "free" | "fee" | "unreachable";
}

function distKm(a: [number, number], b: [number, number]): number {
  const dLat = (a[0] - b[0]) / DEG_PER_KM;
  const dLng = (a[1] - b[1]) / (DEG_PER_KM * Math.cos((a[0] + b[0]) / 2 * Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function zoneLabel(d: number): LocationInfo["zone"] {
  if (d <= FREE_RADIUS) return "free";
  if (d <= MAX_RADIUS) return "fee";
  return "unreachable";
}

const knownLocations: Record<string, [number, number]> = {
  "南京·仙林大学城": [32.106, 118.922],
  "南京·紫金山": [32.065, 118.862],
  "南京·玄武湖": [32.071, 118.798],
  "南京·中山陵": [32.055, 118.856],
  "南京·植物园": [32.058, 118.838],
  "南京·栖霞山": [32.142, 118.962],
  "南京·新街口": [32.039, 118.782],
  "南京·颐和路": [32.058, 118.766],
  "南京·夫子庙": [32.022, 118.792],
  "南京·老门东": [32.015, 118.786],
  "南京·鱼嘴湿地": [31.984, 118.686],
  "南京·钟山体育": [32.050, 118.864],
  "南京·南京博物院": [32.043, 118.823],
  "南京·明孝陵": [32.058, 118.850],
  "南京·美龄宫": [32.052, 118.838],
  "南京·灵谷寺": [32.040, 118.878],
  "南京·红山森林动物园": [32.084, 118.810],
  "南京·清凉山": [32.047, 118.755],
  "南京·莫愁湖": [32.036, 118.756],
  "南京·瞻园": [32.018, 118.788],
  "南京·1865创意园": [32.010, 118.795],
  "南京·南京眼": [31.995, 118.708],
  "南京·大报恩寺": [32.010, 118.780],
  "南京·牛首山": [31.912, 118.758],
  "南京·江宁大学城": [31.946, 118.892],
};

const locationInfoCache = new Map<string, LocationInfo>();
function getLocationInfo(loc: string): LocationInfo {
  if (locationInfoCache.has(loc)) return locationInfoCache.get(loc)!;
  const coords = knownLocations[loc] || STUDIO_CENTER;
  const distance = distKm(STUDIO_CENTER, coords);
  const info: LocationInfo = { coords, distance, zone: zoneLabel(distance) };
  locationInfoCache.set(loc, info);
  return info;
}

/* ══════════════════════════════════════════════
   Custom markers
   ══════════════════════════════════════════════ */
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const studioIcon = divIcon({
  className: "studio-marker",
  html: `<div style="
    width:38px;height:38px;border-radius:50%;
    background:linear-gradient(135deg,#D4A88C,#C0947A);
    box-shadow:0 3px 14px rgba(192,148,122,0.5),inset 0 1px 0 rgba(255,255,255,0.3);
    display:flex;align-items:center;justify-content:center;
    font-size:17px;border:2.5px solid #fff;
  ">📸</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const zoneIcon = (zone: LocationInfo["zone"]) => {
  const colors: Record<string, string> = {
    free: "#7AA675",
    fee: "#D4B05E",
    unreachable: "#B8A090",
  };
  const icons: Record<string, string> = {
    free: "✓",
    fee: "$",
    unreachable: "✗",
  };
  return divIcon({
    className: "zone-marker",
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${colors[zone]};
      box-shadow:0 2px 8px rgba(0,0,0,0.18);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:13px;font-weight:700;
      border:2.5px solid #fff;
    ">${icons[zone]}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

/* ══════════════════════════════════════════════
   Theme-aware tile layer
   ══════════════════════════════════════════════ */
function ThemeAwareTileLayer() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "dark"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      setIsDark(dark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <TileLayer
      key={isDark ? "dark" : "light"}
      attribution=""
      url={isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      }
    />
  );
}

/* ══════════════════════════════════════════════
   Click handler — shows distance when clicking map
   ══════════════════════════════════════════════ */
function MapClickHandler() {
  const { t } = useTranslation();
  const map = useMap();

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const distance = distKm(STUDIO_CENTER, [lat, lng]);
      const zone = zoneLabel(distance);

      const zoneColors: Record<string, string> = {
        free: "#7AA675",
        fee: "#D4B05E",
        unreachable: "#B8A090",
      };
      const zoneLabels: Record<string, string> = {
        free: t("photoMap.clickFree"),
        fee: t("photoMap.clickFee"),
        unreachable: t("photoMap.clickUnreachable"),
      };
      const zoneTitle = t("photoMap.clickTitle");

      L.popup()
        .setLatLng(e.latlng)
        .setContent(buildClickPopupContent(zoneTitle, `${distance.toFixed(1)} km`, zoneLabels[zone], zoneColors[zone]))
        .openOn(map);
    },
  });

  return null;
}

function buildClickPopupContent(title: string, distance: string, zoneText: string, zoneColor: string) {
  const wrapper = document.createElement("div");
  wrapper.style.minWidth = "140px";
  wrapper.style.fontFamily = "sans-serif";

  const titleEl = document.createElement("strong");
  titleEl.style.fontSize = "13px";
  titleEl.style.color = "#5F3C31";
  titleEl.textContent = title;

  const distanceEl = document.createElement("span");
  distanceEl.style.fontSize = "12px";
  distanceEl.style.color = "#8B7A6A";
  distanceEl.textContent = distance;

  const zoneEl = document.createElement("span");
  zoneEl.style.fontSize = "11px";
  zoneEl.style.fontWeight = "600";
  zoneEl.style.color = zoneColor;
  zoneEl.textContent = zoneText;

  wrapper.append(titleEl, document.createElement("br"), distanceEl, document.createElement("br"), zoneEl);
  return wrapper;
}

/* ══════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════ */
export function PhotoMap() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const uniqueLocs = useMemo(
    () => Array.from(new Set(photos.map((p) => p.location))),
    [photos]
  );

  const filteredPhotos = useMemo(() => {
    if (!selectedLocation) return photos;
    return photos.filter((p) => p.location === selectedLocation);
  }, [photos, selectedLocation]);

  const uniqueFilteredLocs = useMemo(
    () => Array.from(new Set(filteredPhotos.map((p) => p.location))),
    [filteredPhotos]
  );

  return (
    <motion.section
      className="section-shell photo-map-section"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="section-heading">
        <p>{t("photoMap.eyebrow")}</p>
        <h2>{t("photoMap.title")}</h2>
        <span>{t("photoMap.intro")}</span>
      </div>

      {/* ── Location Search ── */}
      <LocationSearch locations={uniqueLocs} onLocationSelect={setSelectedLocation} />

      {/* ── Zone Legend ── */}
      <div className="travel-zone-legend">
        <div className="travel-zone-item">
          <span className="travel-zone-dot travel-zone-dot--free" />
          <div>
            <strong>{t("photoMap.legend.free")}</strong>
            <span>{t("photoMap.legend.freeDesc")}</span>
          </div>
        </div>
        <div className="travel-zone-item">
          <span className="travel-zone-dot travel-zone-dot--fee" />
          <div>
            <strong>{t("photoMap.legend.fee")}</strong>
            <span>{t("photoMap.legend.feeDesc")}</span>
          </div>
        </div>
        <div className="travel-zone-item">
          <span className="travel-zone-dot travel-zone-dot--unreachable" />
          <div>
            <strong>{t("photoMap.legend.unreachable")}</strong>
            <span>{t("photoMap.legend.unreachableDesc")}</span>
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="travel-map-container">
        <MapContainer
          center={STUDIO_CENTER}
          zoom={13}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
          zoomControl={true}
        >
          <ThemeAwareTileLayer />
          <MapClickHandler />

          {/* 10km reachable zone boundary */}
          <Circle
            center={STUDIO_CENTER}
            radius={MAX_RADIUS * 1000}
            pathOptions={{
              color: "#D4B05E",
              weight: 2,
              fillColor: "#D4B05E",
              fillOpacity: 0.06,
              dashArray: "8 6",
            }}
          >
            <Tooltip direction="top" permanent>
              <span className="travel-map-label travel-map-label--fee">
                {t("photoMap.mapLabelFee")}
              </span>
            </Tooltip>
          </Circle>

          {/* 2km free zone */}
          <Circle
            center={STUDIO_CENTER}
            radius={FREE_RADIUS * 1000}
            pathOptions={{
              color: "#7AA675",
              weight: 2.5,
              fillColor: "#7AA675",
              fillOpacity: 0.10,
            }}
          >
            <Tooltip direction="top" permanent>
              <span className="travel-map-label travel-map-label--free">
                {t("photoMap.mapLabelFree")}
              </span>
            </Tooltip>
          </Circle>

          {/* Studio center */}
          <Marker position={STUDIO_CENTER} icon={studioIcon}>
            <Popup>
              <div style={{ textAlign: "center", minWidth: 170 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📸</div>
                <strong style={{ color: "#5F3C31", fontSize: 14 }}>
                  {t("photoMap.studioLabel")}
                </strong>
                <br />
                <span style={{ fontSize: 12, color: "#8B7A6A" }}>
                  {t("photoMap.studioDesc")}
                </span>
                <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #EDE4DC" }} />
                <div style={{ fontSize: 11, color: "#7AA675" }}>
                  {t("photoMap.freeLabel")}
                </div>
                <div style={{ fontSize: 11, color: "#D4B05E" }}>
                  {t("photoMap.feeLabel")}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Photo location markers */}
          {uniqueFilteredLocs.map((loc) => {
            const info = getLocationInfo(loc);
            const locPhotos = filteredPhotos.filter((p) => p.location === loc);
            const count = locPhotos.length;
            return (
              <CustomMarker
                key={loc}
                position={info.coords}
                count={count}
                location={loc}
                zone={info.zone}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* ── Zone Info Cards ── */}
      <div className="travel-zone-info">
        <div className="travel-zone-card travel-zone-card--free">
          <span className="travel-zone-emoji">📍</span>
          <div>
            <h4>{t("photoMap.cards.freeTitle")}</h4>
            <p>{t("photoMap.cards.freeText")}</p>
          </div>
        </div>
        <div className="travel-zone-card travel-zone-card--fee">
          <span className="travel-zone-emoji">🚗</span>
          <div>
            <h4>{t("photoMap.cards.feeTitle")}</h4>
            <p>{t("photoMap.cards.feeText")}</p>
          </div>
        </div>
        <div className="travel-zone-card travel-zone-card--unreachable">
          <span className="travel-zone-emoji">✗</span>
          <div>
            <h4>{t("photoMap.cards.unreachableTitle")}</h4>
            <p>{t("photoMap.cards.unreachableText")}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
