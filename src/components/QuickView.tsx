import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Camera, MapPin, X } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { ImageWithFallback } from "./ImageWithFallback";
import { FavoriteButton } from "./FavoriteButton";
import { ShareMenu } from "./ShareMenu";
import type { PhotoItem } from "../types/photo";

const fullSrc = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/1200/${fileName}` : src;
};

type QuickViewProps = {
  photo: PhotoItem | null;
  onClose: () => void;
};

export function QuickView({ photo, onClose }: QuickViewProps) {
  const { t } = useTranslation();
  const contentRef = useFocusTrap<HTMLDivElement>({ active: Boolean(photo) });
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!photo) return undefined;
    lastActiveRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (lastActiveRef.current) {
        window.setTimeout(() => lastActiveRef.current?.focus(), 0);
      }
    };
  }, [photo, onClose]);

  if (!photo) return null;
  return (
    <div
      className="quick-view-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="quick-view" ref={contentRef}>
        <button
          type="button"
          className="quick-view-close"
          onClick={onClose}
          aria-label={t("quickView.close", "Close quick view")}
        >
          <X size={18} />
        </button>
        <div className="quick-view-image">
          {photo.videoUrl ? (
            <video
              src={photo.videoUrl}
              poster={fullSrc(photo.imageUrl || "")}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <ImageWithFallback
              src={fullSrc(photo.imageUrl || "")}
              alt={photo.alt}
              title={photo.title}
              tone="cream"
              priority
              sizes="(max-width: 768px) 100vw, 60vw"
            />
          )}
        </div>
        <div className="quick-view-info">
          <span className="quick-view-style">
            <Camera size={14} />
            {t(`gallery.filters.${photo.style}`, photo.style)}
          </span>
          <h3 id="quick-view-title">{photo.title}</h3>
          {photo.location && (
            <span className="quick-view-location">
              <MapPin size={14} />
              {photo.location}
            </span>
          )}
          <p className="quick-view-alt">{photo.alt}</p>
          <div className="quick-view-actions">
            <Link to={`/gallery/${photo.id}`} className="quick-view-cta">
              {t("quickView.viewDetails", "View details")}
              <ArrowRight size={14} />
            </Link>
            <FavoriteButton
              entry={{
                id: photo.id,
                title: photo.title,
                href: `/gallery/${photo.id}`,
                imageUrl: photo.imageUrl,
              }}
            />
            <ShareMenu
              variant="icon"
              url={typeof window !== "undefined" ? `${window.location.origin}/gallery/${photo.id}` : ""}
              title={photo.title}
              text={`${photo.title} — ${photo.location}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
