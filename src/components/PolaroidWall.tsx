import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicPhotos } from "../hooks/usePublicPhotos";

export function PolaroidWall() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();
  const [fannedOut, setFannedOut] = useState(false);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const stageRef = useRef<HTMLDivElement>(null);

  const POLAROID_ITEMS = useMemo(() => photos.slice(0, 6), [photos]);

  const handleCardClick = useCallback((id: string) => {
    setFlippedId((prev) => (prev === id ? null : id));
  }, []);

  const handleFocus = useCallback((idx: number) => {
    setFocusIdx(idx);
    setFannedOut(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFannedOut(false);
    setFlippedId(null);
  }, []);

  const handleImageLoad = useCallback((id: string) => {
    setLoadedIds((prev) => new Set(prev).add(id));
  }, []);

  return (
    <section className="polaroid-wall-section">
      <div className="polaroid-header">
        <span className="polaroid-eyebrow">{t("polaroid.eyebrow")}</span>
        <h2>{t("polaroid.title")}</h2>
        <p className="polaroid-hint">
          {fannedOut ? t("polaroid.hintExpanded") : t("polaroid.hintCollapsed")}
        </p>
      </div>

      <div
        className={`polaroid-stage ${fannedOut ? "is-fanned" : ""}`}
        ref={stageRef}
        onClick={(e) => {
          if (e.target === stageRef.current) handleBlur();
        }}
      >
        {POLAROID_ITEMS.map((item, i) => {
          const isFlipped = flippedId === item.id;
          const isFocused = fannedOut && focusIdx === i;
          const angle = (i - (POLAROID_ITEMS.length - 1) / 2) * 8;
          const offsetX = (i - (POLAROID_ITEMS.length - 1) / 2) * 40;

          return (
            <div
              key={item.id}
              className={`polaroid-card ${isFlipped ? "is-flipped" : ""} ${isFocused ? "is-focused" : ""}`}
              style={{
                transform: fannedOut
                  ? `translateX(${offsetX}px) rotate(${angle}deg) translateY(-${Math.abs(angle) * 2}px) scale(${isFocused ? 1.08 : 0.95})`
                  : `rotate(${(i - (POLAROID_ITEMS.length - 1) / 2) * 3}deg) translateY(${Math.abs(i - (POLAROID_ITEMS.length - 1) / 2) * -4}px)`,
                zIndex: isFocused ? 100 : POLAROID_ITEMS.length - i,
                transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              onClick={() => handleCardClick(item.id)}
              onMouseEnter={() => handleFocus(i)}
              onMouseLeave={() => {}}
              role="button"
              tabIndex={0}
              aria-label={`${item.title} – ${item.style}. ${isFlipped ? t("polaroid.hintExpanded") : t("polaroid.hintCollapsed")}`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(item.id); } }}
            >
              <div className="polaroid-card-inner">
                {/* Front — Polaroid photo */}
                <div className="polaroid-card-front">
                  <div className="polaroid-photo-wrap">
                    <img
                      src={item.imageUrl}
                      alt={item.alt}
                      className={loadedIds.has(item.id) ? "is-loaded" : ""}
                      loading="lazy"
                      onLoad={() => handleImageLoad(item.id)}
                    />
                  </div>
                  <div className="polaroid-caption">
                    <span>{item.title}</span>
                    <span className="polaroid-caption-sep">·</span>
                    <span>{item.style}</span>
                  </div>
                </div>

                {/* Back — story / info */}
                <div className="polaroid-card-back">
                  <div className="polaroid-back-content">
                    <strong>{item.title}</strong>
                    <span className="polaroid-back-style">{item.style}</span>
                    <span className="polaroid-back-location">{item.location}</span>
                    <p className="polaroid-back-note">{t("polaroid.backNote")}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Navigation arrows */}
        <button
          className="polaroid-nav polaroid-nav-left"
          onClick={(e) => {
            e.stopPropagation();
            setFocusIdx((prev) => (prev - 1 + POLAROID_ITEMS.length) % POLAROID_ITEMS.length);
          }}
          aria-label={t("reviews.prev")}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="polaroid-nav polaroid-nav-right"
          onClick={(e) => {
            e.stopPropagation();
            setFocusIdx((prev) => (prev + 1) % POLAROID_ITEMS.length);
          }}
          aria-label={t("reviews.next")}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
