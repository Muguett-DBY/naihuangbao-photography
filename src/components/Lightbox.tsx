import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PhotoItem } from "../types/photo";

type LightboxProps = {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }: LightboxProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[currentIndex];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          onPrev();
          break;
        case "ArrowRight":
          onNext();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;

  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        className="lightbox-close"
        onClick={onClose}
        aria-label="关闭"
        type="button"
      >
        <X size={24} aria-hidden="true" />
      </button>

      <button
        className="lightbox-nav lightbox-prev"
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label="上一张"
        type="button"
      >
        <ChevronLeft size={28} aria-hidden="true" />
      </button>

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img
          key={currentIndex}
          ref={imageRef}
          className="lightbox-image"
          src={photo.imageUrl}
          alt={photo.alt}
          decoding="async"
        />
        <div className="lightbox-info">
          <strong>{photo.title}</strong>
          <span>{photo.location}</span>
        </div>
      </div>

      <button
        className="lightbox-nav lightbox-next"
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        aria-label="下一张"
        type="button"
      >
        <ChevronRight size={28} aria-hidden="true" />
      </button>

      <div className="lightbox-counter" aria-live="polite">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}
