import { useEffect, useRef } from "react";
import PhotoSwipe from "photoswipe";
import "photoswipe/style.css";
import type { PhotoItem } from "../types/photo";

type LightboxProps = {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function Lightbox({ photos, currentIndex, onClose }: LightboxProps) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const indexRef = useRef(currentIndex);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const dataSource = photos.map((p) => ({
      src: p.imageUrl,
      alt: p.alt || p.title,
      width: 1600,
      height: 1200,
      title: p.title,
    }));

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

    pswp.on("close", () => {
      if (win.lenis) win.lenis.start();
      onClose();
    });

    pswp.on("change", () => {
      // Sync with our state if needed
    });

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
