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

const LENIS = (w: Window) => (w as unknown as { lenis?: { stop(): void; start(): void } }).lenis;

export default function Lightbox({ photos, currentIndex, onClose }: LightboxProps) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const indexRef = useRef(currentIndex);
  const onCloseRef = useRef(onClose);
  const photosRef = useRef(photos);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
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

    const lenis = LENIS(window);
    if (lenis) lenis.stop();

    const onSlideChange = () => {
      const pswpEl = pswp.element;
      if (!pswpEl) return;
      pswpEl.querySelectorAll("video:not([paused])").forEach((v) => (v as HTMLVideoElement).pause());
    };

    pswp.on("close", () => {
      const l = LENIS(window);
      if (l) l.start();
      onCloseRef.current();
    });

    pswp.on("change", onSlideChange);

    pswp.init();
    pswpRef.current = pswp;

    return () => {
      if (pswpRef.current) {
        pswpRef.current.destroy();
        pswpRef.current = null;
      }
      const l = LENIS(window);
      if (l) l.start();
    };
  }, []);

  return null;
}
