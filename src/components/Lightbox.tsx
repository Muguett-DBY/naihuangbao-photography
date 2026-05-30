import { useEffect, useRef } from "react";
import PhotoSwipe from "photoswipe";
import "photoswipe/style.css";
import type { PhotoItem } from "../types/photo";

type LightboxProps = {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
};

export default function Lightbox({ photos, currentIndex, onClose }: LightboxProps) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const indexRef = useRef(currentIndex);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const dataSource = photos.map((p) => {
      if (p.videoUrl) {
        return {
          html: `<div class="pswp-video-slide">
            <video
              src="${p.videoUrl}"
              poster="${p.imageUrl || ""}"
              controls
              autoplay
              playsinline
              style="max-width:100%;max-height:80vh;border-radius:8px;outline:none;"
              aria-label="${p.title}"
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

    // Stop Lenis while open
    const win = window as any;
    if (win.lenis) win.lenis.stop();

    // Pause any playing videos on slide change
    const onSlideChange = () => {
      const pswpEl = pswp.element;
      if (!pswpEl) return;
      const playingVideos = pswpEl.querySelectorAll("video:not([paused])");
      playingVideos.forEach((v) => (v as HTMLVideoElement).pause());
    };

    pswp.on("close", () => {
      if (win.lenis) win.lenis.start();
      onClose();
    });

    pswp.on("change", onSlideChange);

    pswp.init();
    pswpRef.current = pswp;

    return () => {
      if (pswpRef.current) {
        pswpRef.current.destroy();
        pswpRef.current = null;
      }
      if (win.lenis) win.lenis.start();
    };
  }, []); // Only run once on mount — PhotoSwipe manages its own lifecycle

  return null; // PhotoSwipe renders its own DOM via portal
}
