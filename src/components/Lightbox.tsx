import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PhotoItem } from "../types/photo";

type LightboxProps = {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function usePreload(src: string) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true);
    if (img.complete) setLoaded(true);
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  return loaded;
}

export default function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const photo = photos[currentIndex];

  // 预加载相邻图片
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
  const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
  usePreload(photos[prevIndex]?.imageUrl || "");
  usePreload(photos[nextIndex]?.imageUrl || "");

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

  // 切换时添加短暂过渡动画
  useEffect(() => {
    setIsSwitching(true);
    const timer = setTimeout(() => setIsSwitching(false), 150);
    return () => clearTimeout(timer);
  }, [currentIndex]);

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
        <div className={`lightbox-image-wrap ${isSwitching ? "is-switching" : ""}`}>
          <img
            className="lightbox-image"
            src={photo.imageUrl}
            alt={photo.alt}
            decoding="async"
            loading="eager"
          />
        </div>
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
