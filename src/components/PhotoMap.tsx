import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from "react-leaflet";
import { Icon, divIcon } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/* ══════════════════════════════════════════════
   Studio Center — 南京审计大学金审学院 / 仙林大学城
   ══════════════════════════════════════════════ */
const STUDIO_CENTER: [number, number] = [32.106, 118.922];
const FREE_RADIUS = 2; // km — no travel fee
const MAX_RADIUS = 6; // km — can reach (with fee)
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
   Component
   ══════════════════════════════════════════════ */
export function PhotoMap() {
  const { photos } = usePublicPhotos();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const uniqueLocs = useMemo(
    () => Array.from(new Set(photos.map((p) => p.location))),
    [photos]
  );

  if (!mounted) return null;

  return (
    <motion.section
      className="section-shell photo-map-section"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="section-heading">
        <p>服务范围</p>
        <h2>拍摄可达地图</h2>
        <span>以仙林大学城金审学院为中心，展示拍摄服务覆盖区域</span>
      </div>

      {/* ── Zone Legend ── */}
      <div className="travel-zone-legend">
        <div className="travel-zone-item">
          <span className="travel-zone-dot travel-zone-dot--free" />
          <div>
            <strong>免费区</strong>
            <span>2公里内 · 无需路费</span>
          </div>
        </div>
        <div className="travel-zone-item">
          <span className="travel-zone-dot travel-zone-dot--fee" />
          <div>
            <strong>收费区</strong>
            <span>2~6公里 · 报销路费</span>
          </div>
        </div>
        <div className="travel-zone-item">
          <span className="travel-zone-dot travel-zone-dot--unreachable" />
          <div>
            <strong>超出范围</strong>
            <span>6公里以上 · 无法抵达</span>
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
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 6km reachable zone boundary */}
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
                6km — 有偿可达
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
                2km — 免费
              </span>
            </Tooltip>
          </Circle>

          {/* Studio center */}
          <Marker position={STUDIO_CENTER} icon={studioIcon}>
            <Popup>
              <div style={{ textAlign: "center", minWidth: 170 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📸</div>
                <strong style={{ color: "#5F3C31", fontSize: 14 }}>
                  金审学院 · 仙林大学城
                </strong>
                <br />
                <span style={{ fontSize: 12, color: "#8B7A6A" }}>
                  拍摄基地 · 从这里出发
                </span>
                <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #EDE4DC" }} />
                <div style={{ fontSize: 11, color: "#7AA675" }}>
                  ✅ 2km内免费到达
                </div>
                <div style={{ fontSize: 11, color: "#D4B05E" }}>
                  🚗 2~6km 报销路费
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Photo location markers */}
          {uniqueLocs.map((loc) => {
            const info = getLocationInfo(loc);
            const count = photos.filter((p) => p.location === loc).length;
            return (
              <Marker key={loc} position={info.coords} icon={zoneIcon(info.zone)}>
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <strong style={{ color: "#5F3C31" }}>{loc}</strong>
                    <br />
                    <span style={{ fontSize: 12, color: "#8B7A6A" }}>
                      {count} 张作品 · {info.distance.toFixed(1)}km
                    </span>
                    <br />
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: info.zone === "free" ? "#7AA675" :
                             info.zone === "fee" ? "#D4B05E" : "#B8A090",
                    }}>
                      {info.zone === "free" ? "✅ 免费到达" :
                       info.zone === "fee" ? "🚗 需报销路费" : "✗ 无法抵达"}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* ── Zone Info Cards ── */}
      <div className="travel-zone-info">
        <div className="travel-zone-card travel-zone-card--free">
          <span className="travel-zone-emoji">📍</span>
          <div>
            <h4>2公里内 · 免费</h4>
            <p>仙林大学城、金审学院周边，步行或电瓶车可达，不收路费。</p>
          </div>
        </div>
        <div className="travel-zone-card travel-zone-card--fee">
          <span className="travel-zone-emoji">🚗</span>
          <div>
            <h4>2~6公里 · 报销路费</h4>
            <p>超出免费区但在可达范围内，需报销实际路费（打车或地铁）。</p>
          </div>
        </div>
        <div className="travel-zone-card travel-zone-card--unreachable">
          <span className="travel-zone-emoji">✗</span>
          <div>
            <h4>6公里以上 · 暂不可达</h4>
            <p>超出日常拍摄范围，暂时无法提供服务，敬请谅解。</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
