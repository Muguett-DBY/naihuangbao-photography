import { useEffect, useRef } from "react";
import PhotoSwipe from "photoswipe";
import "photoswipe/style.css";
import type { PhotoItem } from "../types/photo";

type LightboxProps = {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export default function Lightbox({ photos, currentIndex, onClose }: LightboxProps) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const onCloseRef = useRef(onClose);
  const closeHandledRef = useRef(false);
  const closeFallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeHandledRef.current = false;
    const dataSource = photos.map((p) => {
      if (p.videoUrl) {
        return {
          html: `<div class="pswp-video-slide">
            <video
              src="${escapeAttr(p.videoUrl)}"
              poster="${escapeAttr(p.imageUrl || "")}"
              controls
              autoplay
              playsinline
              style="max-width:100%;max-height:80vh;border-radius:8px;outline:none;"
              aria-label="${escapeAttr(p.title)}"
            />
          </div>`,
          width: 1600,
          height: 900,
        };
      }
      return {
        src: p.imageUrl,
        alt: p.alt || p.title,
        width: 1600,
        height: 1200,
        title: p.title,
      };
    });

    const pswp = new PhotoSwipe({
      dataSource,
      index: currentIndex,
      bgOpacity: 0.92,
      showHideAnimationType: "zoom",
      wheelToZoom: true,
      tapAction: "close",
      doubleTapAction: "zoom",
      preloaderDelay: 400,
      padding: { top: 48, bottom: 64, left: 0, right: 0 },
    });

    const lenis = window.__nhbLenis;
    if (lenis) lenis.stop();

    const finishClose = () => {
      if (closeHandledRef.current) return;
      closeHandledRef.current = true;
      const l = window.__nhbLenis;
      if (l) l.start();
      onCloseRef.current();
    };

    const onSlideChange = () => {
      const pswpEl = pswp.element;
      if (!pswpEl) return;
      pswpEl.querySelectorAll("video:not([paused])").forEach((v) => (v as HTMLVideoElement).pause());
    };

    pswp.on("close", () => {
      finishClose();
    });

    pswp.on("change", onSlideChange);

    pswp.init();
    pswpRef.current = pswp;

    const closeLightbox = () => {
      const instance = pswpRef.current;
      if (!instance) return;
      instance.options.showHideAnimationType = "none";
      instance.close();
      closeFallbackTimerRef.current = window.setTimeout(() => {
        closeFallbackTimerRef.current = null;
        if (instance.element?.isConnected) {
          instance.destroy();
          instance.element?.remove();
          pswpRef.current = null;
        }
        if (!closeHandledRef.current) {
          finishClose();
        }
      }, 0);
    };
    const onFallbackClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest(".pswp__button--close")) {
        closeLightbox();
      }
    };
    const onFallbackKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    };

    document.addEventListener("click", onFallbackClick, true);
    document.addEventListener("keydown", onFallbackKeydown, true);

    return () => {
      if (closeFallbackTimerRef.current !== null) {
        window.clearTimeout(closeFallbackTimerRef.current);
        closeFallbackTimerRef.current = null;
      }
      document.removeEventListener("click", onFallbackClick, true);
      document.removeEventListener("keydown", onFallbackKeydown, true);
      if (pswpRef.current) {
        pswpRef.current.destroy();
        pswpRef.current = null;
      }
      const l = window.__nhbLenis;
      if (l) l.start();
    };
  }, [photos, currentIndex]);

  return null;
}
