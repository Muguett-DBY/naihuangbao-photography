import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Known Nanjing photo locations (approximate coordinates)
const knownLocations: Record<string, [number, number]> = {
  "南京·玄武湖": [32.071, 118.798],
  "南京·颐和路": [32.058, 118.766],
  "南京·中山陵": [32.055, 118.856],
  "南京·夫子庙": [32.022, 118.792],
  "南京·老门东": [32.015, 118.786],
  "南京·植物园": [32.058, 118.838],
  "南京·鱼嘴湿地": [31.984, 118.686],
  "南京·牛首山": [31.893, 118.735],
  "南京·大学城": [31.891, 118.917],
  "南京·城墙": [32.032, 118.776],
  "南京": [32.060, 118.796],
  "南京·新街口": [32.039, 118.782],
  "南京·莫愁湖": [32.034, 118.760],
  "南京·清凉山": [32.044, 118.750],
  "南京·紫金山": [32.065, 118.862],
};

// Fix Leaflet's default icon paths for bundlers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export function PhotoMap() {
  const { photos } = usePublicPhotos();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Avoid SSR mismatch

  return (
    <motion.section
      className="section-shell photo-map-section"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="section-heading">
        <p>拍摄地点</p>
        <h2>南京拍摄地图</h2>
        <span>标记了我们经常出没的拍摄地点</span>
      </div>

      <div
        style={{
          width: "100%",
          height: "min(55vh, 440px)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(95, 60, 49, 0.1)",
        }}
      >
        <MapContainer
          center={[32.060, 118.796]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ width: "100%", height: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Collect unique locations from photos */}
          {Array.from(
            new Set(photos.map((p) => p.location))
          ).map((loc) => {
            const coords = knownLocations[loc] || knownLocations["南京"];
            return (
              <Marker key={loc} position={coords}>
                <Popup>
                  <strong>{loc}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: "#666" }}>
                    {photos.filter((p) => p.location === loc).length} 张作品
                  </span>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </motion.section>
  );
}
