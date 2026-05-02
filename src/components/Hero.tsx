import { ArrowDown, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { getFeaturedPhotos, getPublicPhotos } from "../lib/gallery";
import { useParallax } from "../hooks/useParallax";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import type { PhotoItem } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";

const placeholderPhoto: PhotoItem = {
  id: "hero-placeholder",
  title: "作品待上传",
  style: "jiangnan",
  location: "",
  imageUrl: "",
  alt: "作品待上传",
  featured: false,
  clientAuthorized: true,
  visibility: "public",
};

function useHeroCardTilt() {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cardNode = cardRef.current;
    if (!cardNode) return;
    const cardElement: HTMLDivElement = cardNode;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopPointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frameId: number | null = null;
    let pointerX = 0;
    let pointerY = 0;

    function shouldDisableTilt() {
      return reducedMotionQuery.matches || !desktopPointerQuery.matches;
    }

    function resetTilt() {
      cardElement.style.setProperty("--tilt-x", "0deg");
      cardElement.style.setProperty("--tilt-y", "0deg");
    }

    function writeTilt() {
      frameId = null;
      if (shouldDisableTilt()) {
        resetTilt();
        return;
      }

      const rect = cardElement.getBoundingClientRect();
      const x = (pointerX - rect.left) / rect.width - 0.5;
      const y = (pointerY - rect.top) / rect.height - 0.5;
      cardElement.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
      cardElement.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
    }

    function onPointerMove(event: PointerEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frameId === null) {
        frameId = requestAnimationFrame(writeTilt);
      }
    }

    function onPointerLeave() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      resetTilt();
    }

    function onPreferenceChange() {
      if (shouldDisableTilt()) resetTilt();
    }

    cardElement.addEventListener("pointermove", onPointerMove, { passive: true });
    cardElement.addEventListener("pointerleave", onPointerLeave);
    reducedMotionQuery.addEventListener("change", onPreferenceChange);
    desktopPointerQuery.addEventListener("change", onPreferenceChange);

    return () => {
      cardElement.removeEventListener("pointermove", onPointerMove);
      cardElement.removeEventListener("pointerleave", onPointerLeave);
      reducedMotionQuery.removeEventListener("change", onPreferenceChange);
      desktopPointerQuery.removeEventListener("change", onPreferenceChange);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return cardRef;
}

export function Hero() {
  const { siteConfig } = useSiteContent();
  const { photos } = usePublicPhotos();
  const { ref: parallaxRef } = useParallax(0.25);
  const largeCardRef = useHeroCardTilt();

  const featuredPhotos = getFeaturedPhotos(photos, 3);
  const extraPhotos = getPublicPhotos(photos).filter(
    (photo) => !featuredPhotos.some((featured) => featured.id === photo.id),
  );
  const heroPhotos = [...featuredPhotos, ...extraPhotos];
  const [mainPhoto, topPhoto, bottomPhoto] = [
    heroPhotos[0] ?? placeholderPhoto,
    heroPhotos[1] ?? placeholderPhoto,
    heroPhotos[2] ?? placeholderPhoto,
  ];

  return (
    <section id="top" className="hero" ref={parallaxRef}>
      <div className="hero-copy">
        <p className="kicker">
          <Sparkles size={15} />
          {siteConfig.city} · 女生写真 / 情侣约拍
        </p>
        <h1>
          把柔软的日常，
          <span>拍成有呼吸感的纪念。</span>
        </h1>
        <p className="hero-intro">{siteConfig.description}</p>
        <div className="hero-actions">
          <a className="primary-button" href="#booking">
            预约咨询
          </a>
          <a className="text-button" href="#gallery">
            查看作品
            <ArrowDown size={16} />
          </a>
        </div>
      </div>
      <div className="hero-visual" aria-label="柔雾胶片感作品预览">
        <div
          ref={largeCardRef}
          className="hero-card hero-card-large"
          data-caption="奶黄光影"
          data-parallax-factor="0.6"
        >
          <ImageWithFallback
            src={mainPhoto.imageUrl}
            alt={mainPhoto.alt}
            title={mainPhoto.title}
            tone="sage"
            priority
            sizes="(max-width: 900px) 92vw, 48vw"
          />
        </div>
        <div
          className="hero-card hero-card-small hero-card-top"
          data-caption="甜桃快照"
          data-parallax-factor="-0.3"
        >
          <ImageWithFallback
            src={topPhoto.imageUrl}
            alt={topPhoto.alt}
            title={topPhoto.title}
            tone="rose"
            sizes="(max-width: 900px) 42vw, 18vw"
          />
        </div>
        <div
          className="hero-card hero-card-small hero-card-bottom"
          data-caption="柔软贴纸"
          data-parallax-factor="0.4"
        >
          <ImageWithFallback
            src={bottomPhoto.imageUrl}
            alt={bottomPhoto.alt}
            title={bottomPhoto.title}
            tone="cream"
            sizes="(max-width: 900px) 42vw, 18vw"
          />
        </div>
      </div>
      <a className="hero-scroll-cue" href="#gallery" aria-label="向下滚动到作品">
        <ArrowDown size={18} />
      </a>
    </section>
  );
}
