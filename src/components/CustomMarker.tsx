import { Marker, Popup, Tooltip } from "react-leaflet";
import { divIcon } from "leaflet";
import { useTranslation } from "react-i18next";

type CustomMarkerProps = {
  position: [number, number];
  count: number;
  location: string;
  zone: "free" | "fee" | "unreachable";
  onClick?: () => void;
};

const zoneColors: Record<string, string> = {
  free: "#7AA675",
  fee: "#D4B05E",
  unreachable: "#B8A090",
};

const zoneIcons: Record<string, string> = {
  free: "✓",
  fee: "$",
  unreachable: "✗",
};

export function CustomMarker({ position, count, location, zone, onClick }: CustomMarkerProps) {
  const { t } = useTranslation();
  const markerEventHandlers = onClick ? { click: onClick } : undefined;
  
  const markerIcon = divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width:36px;
        height:36px;
        border-radius:50%;
        background:${zoneColors[zone]};
        box-shadow:0 3px 12px rgba(0,0,0,0.2);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
        font-size:14px;
        font-weight:700;
        border:2.5px solid #fff;
        cursor:pointer;
      ">
        ${count > 9 ? "9+" : count}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  return (
    <Marker position={position} icon={markerIcon} eventHandlers={markerEventHandlers}>
      <Tooltip direction="top" offset={[0, -10]}>
        {location} ({count})
      </Tooltip>
      <Popup>
        <div style={{ minWidth: 150, maxWidth: 220 }}>
          <strong style={{ color: "#5F3C31", fontSize: 13 }}>{location}</strong>
          <br />
          <span style={{ fontSize: 12, color: "#8B7A6A" }}>
            {count} {t("photoMap.worksLabel", "photos")}
          </span>
          <br />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: zoneColors[zone],
          }}>
            {zone === "free" ? t("photoMap.freePopup", "Free travel") :
             zone === "fee" ? t("photoMap.feePopup", "Travel fee applies") :
             t("photoMap.unreachablePopup", "Not available")}
          </span>
        </div>
      </Popup>
    </Marker>
  );
}
