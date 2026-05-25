"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { galleryItems } from "../data/gallery";
import type { PhotoItem } from "../types/photo";

const POLAROID_ITEMS = galleryItems.slice(0, 6);

export function PolaroidWall() {
  const { t } = useTranslation();
  const [fannedOut, setFannedOut] = useState(false);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const photos = POLAROID_ITEMS;

  const handleCardClick = useCallback((id: string) => {
    if (!fannedOut) { setFannedOut(true); return; }
    setFlippedId((prev) => (prev === id ? null : id));
  }, [fannedOut]);

  const handleBackdrop = useCallback(() => {
    if (flippedId) { setFlippedId(null); return; }
    if (fannedOut) { setFannedOut(false); setFocusIdx(0); }
  }, [fannedOut, flippedId]);

  const navigate = useCallback((dir: -1 | 1) => {
    setFocusIdx((prev) => {
      const next = prev + dir;
      if (next < 0) return photos.length - 1;
      if (next >= photos.length) return 0;
      return next;
    });
  }, [photos.length]);

  return (
    <section className="polaroid-wall-section">
      <div className="polaroid-header">
        <span className="polaroid-eyebrow">{t("polaroid.eyebrow")}</span>
        <h2>{t("polaroid.title")}</h2>
        <p className="polaroid-hint">
          {fannedOut ? t("polaroid.hintExpanded") : t("polaroid.hintCollapsed")}
        </p>
      </div>

      <div ref={stageRef} className={`polaroid-stage ${fannedOut ? "is-fanned" : ""}`} onClick={handleBackdrop}>
        {fannedOut && (
          <>
            <button className="polaroid-nav polaroid-nav-left" onClick={(e) => { e.stopPropagation(); navigate(-1); }} aria-label="上一张">
              <ChevronLeft size={24} />
            </button>
            <button className="polaroid-nav polaroid-nav-right" onClick={(e) => { e.stopPropagation(); navigate(1); }} aria-label="下一张">
              <ChevronRight size={24} />
            </button>
          </>
        )}

        <div className="polaroid-deck" style={{ perspective: 1200 }}>
          {photos.map((photo, index) => {
            const offset = index - focusIdx;
            const isFocused = index === focusIdx;
            const isFlipped = flippedId === photo.id;

            let transform = "";
            if (!fannedOut) {
              const rot = (index - (photos.length - 1) / 2) * 1.8;
              const x = (index - (photos.length - 1) / 2) * 2;
              const y = index * 0.6;
              transform = `translateX(${x}px) translateY(${y}px) rotate(${rot}deg)`;
            } else {
              const spreadX = offset * 110;
              const spreadRot = offset * 6;
              const z = isFocused ? 80 : -Math.abs(offset) * 20;
              transform = `translateX(${spreadX}px) translateZ(${z}px) rotateY(${spreadRot * 0.5}deg) scale(${isFocused ? 1.12 : 0.9})`;
            }

            return (
              <PolaroidCard
                key={photo.id}
                photo={photo}
                transform={transform}
                isFlipped={isFlipped}
                isFocused={isFocused}
                isFanned={fannedOut}
                index={index}
                onCardClick={() => handleCardClick(photo.id)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PolaroidCard({
  photo, transform, isFlipped, isFocused, isFanned, index, onCardClick,
}: {
  photo: PhotoItem; transform: string; isFlipped: boolean; isFocused: boolean; isFanned: boolean; index: number; onCardClick: () => void;
}) {
  const { t } = useTranslation();
  const [imgLoaded, setImgLoaded] = useState(false);
  const thumbSrc = photo.imageUrl?.replace("/images/gallery/", "/images/gallery/640/") ?? "";

  return (
    <div
      className={`polaroid-card ${isFlipped ? "is-flipped" : ""} ${isFocused ? "is-focused" : ""} ${isFanned ? "is-fanned" : ""}`}
      style={{
        transform,
        zIndex: isFocused ? 100 : isFanned ? 10 - Math.abs(index - 3) : index,
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s",
      }}
      onClick={(e) => { e.stopPropagation(); onCardClick(); }}
      role="button"
      tabIndex={isFanned && isFocused ? 0 : -1}
      aria-label={`${photo.title} — ${styleLabel(photo.style)}`}
    >
      <div className="polaroid-card-inner">
        <div className="polaroid-card-front">
          <div className="polaroid-photo-wrap">
            {!imgLoaded && <div className="polaroid-photo-skeleton" />}
            <img
              src={thumbSrc}
              alt={photo.alt}
              loading={index < 4 ? "eager" : "lazy"}
              onLoad={() => setImgLoaded(true)}
              className={imgLoaded ? "is-loaded" : ""}
              width={400} height={500}
            />
          </div>
          <div className="polaroid-caption">
            <span className="polaroid-caption-location">{photo.location}</span>
            <span className="polaroid-caption-sep">·</span>
            <span className="polaroid-caption-style">{styleLabel(photo.style)}</span>
          </div>
        </div>
        <div className="polaroid-card-back">
          <div className="polaroid-back-content">
            <strong>{photo.title}</strong>
            <span className="polaroid-back-style">{styleLabel(photo.style)}</span>
            <span className="polaroid-back-location">{photo.location}</span>
            <p className="polaroid-back-note">{t("polaroid.backNote")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function styleLabel(style: string): string {
  const labels: Record<string, string> = {
    jiangnan: "江南感", street: "街拍", park: "公园",
    sweet: "甜酷", couple: "情侣", indoor: "室内",
  };
  return labels[style] || style;
}
