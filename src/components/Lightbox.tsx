import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PhotoItem } from "../types/photo";

type LightboxProps = {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

type ImageLoadState = {
  src: string;
  status: "loading" | "loaded" | "error";
};

function usePreload(src: string) {
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
}

export default function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [imageLoadState, setImageLoadState] = useState<ImageLoadState>(() => ({
    src: photos[currentIndex]?.imageUrl ?? "",
    status: "loading",
  }));
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const lastDist = useRef(0);
  const photo = photos[currentIndex];

  // Reset zoom on image change
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [currentIndex]);

  // Wheel zoom
  useEffect(() => {
    const wrap = imgWrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.max(0.5, Math.min(5, s - e.deltaY * 0.003)));
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, []);

  // Touch pinch-zoom
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      setScale((s) => Math.max(0.5, Math.min(5, s + (dist - lastDist.current) * 0.01)));
      lastDist.current = dist;
    }
  };

  // Drag to pan
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  };

  useEffect(() => {
    if (!dragging.current) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setTranslate({
        x: dragStart.current.tx + (e.clientX - dragStart.current.x),
        y: dragStart.current.ty + (e.clientY - dragStart.current.y),
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [scale, translate]);

  // 预加载相邻图片
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
  const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
  usePreload(photos[prevIndex]?.imageUrl || "");
  usePreload(photos[nextIndex]?.imageUrl || "");

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        case "ArrowLeft":
          event.preventDefault();
          onPrev();
          break;
        case "ArrowRight":
          event.preventDefault();
          onNext();
          break;
        case "Tab":
          trapDialogFocus(event, dialogRef.current);
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previousActiveElementRef.current?.isConnected) {
        previousActiveElementRef.current.focus({ preventScroll: true });
      }
    };
  }, [onClose, onPrev, onNext]);

  // Check the DOM image before paint so cached images cannot miss onLoad.
  useLayoutEffect(() => {
    if (!photo) return;
    setImageLoadState({
      src: photo.imageUrl,
      status: readImageElementStatus(imgRef.current),
    });
  }, [photo?.imageUrl]);

  if (!photo) return null;

  const activeImageStatus = imageLoadState.src === photo.imageUrl ? imageLoadState.status : "loading";
  const isImageLoaded = activeImageStatus === "loaded";
  const isImageError = activeImageStatus === "error";

  function handleImageLoad() {
    setImageLoadState({
      src: photo.imageUrl,
      status: "loaded",
    });
  }

  function handleImageError() {
    setImageLoadState({
      src: photo.imageUrl,
      status: "error",
    });
  }

  const dialog = (
    <div
      ref={dialogRef}
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      tabIndex={-1}
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
        <div
          ref={imgWrapRef}
          className={`lightbox-image-wrap ${isImageLoaded ? "is-loaded" : ""} ${isImageError ? "is-error" : ""} ${scale > 1 ? "is-zoomed" : ""}`}
          aria-busy={!isImageLoaded && !isImageError}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onMouseDown={onMouseDown}
          style={{ cursor: scale > 1 ? "grab" : undefined }}
        >
          {!isImageLoaded && !isImageError ? (
            <div className="lightbox-loading" role="status" aria-live="polite">
              <span className="lightbox-spinner" aria-hidden="true" />
              <span>加载中</span>
            </div>
          ) : null}
          {isImageError ? (
            <div className="lightbox-image-error" role="status">
              图片加载失败
            </div>
          ) : null}
          <img
            ref={imgRef}
            className={`lightbox-image ${isImageLoaded ? "is-loaded" : ""}`}
            src={photo.imageUrl}
            alt={photo.alt}
            decoding="async"
            loading="eager"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              transition: dragging.current ? "none" : "transform 0.15s ease",
            }}
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

  return createPortal(dialog, document.body);
}

function trapDialogFocus(event: KeyboardEvent, dialog: HTMLElement | null) {
  if (!dialog) return;
  const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(
    [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(","),
  ));

  if (focusableElements.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function readImageElementStatus(img: HTMLImageElement | null): ImageLoadState["status"] {
  if (!img?.complete) return "loading";
  return img.naturalWidth > 0 && img.naturalHeight > 0 ? "loaded" : "error";
}
