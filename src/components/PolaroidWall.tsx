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

  return (
    <section className="polaroid-shell">
      <div className="polaroid-header">
        <span className="section-eyebrow">{t("polaroid.eyebrow")}</span>
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
          const angle = (i - (POLAROID_ITEMS.length - 1) / 2) * 8;
          const offsetX = (i - (POLAROID_ITEMS.length - 1) / 2) * 24;

          return (
            <div
              key={item.id}
              className={`polaroid-card ${isFlipped ? "is-flipped" : ""} ${focusIdx === i && fannedOut ? "is-focused" : ""}`}
              style={{
                transform: fannedOut
                  ? `translateX(${offsetX}px) rotate(${angle}deg) translateY(-${Math.abs(angle) * 2}px)`
                  : `rotate(0deg)`,
                zIndex: focusIdx === i ? 10 : POLAROID_ITEMS.length - i,
              }}
              onClick={() => handleCardClick(item.id)}
              onMouseEnter={() => handleFocus(i)}
              onMouseLeave={() => {}}
            >
              <div className="polaroid-card-inner">
                <div className="polaroid-card-front">
                  <img src={item.imageUrl} alt={item.alt} />
                </div>
                <div className="polaroid-card-back">
                  <p>{t("polaroid.backNote")}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {fannedOut && (
        <div className="polaroid-nav">
          <button
            onClick={() => setFocusIdx((prev) => (prev - 1 + POLAROID_ITEMS.length) % POLAROID_ITEMS.length)}
            aria-label={t("reviews.prev")}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setFocusIdx((prev) => (prev + 1) % POLAROID_ITEMS.length)}
            aria-label={t("reviews.next")}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
}
