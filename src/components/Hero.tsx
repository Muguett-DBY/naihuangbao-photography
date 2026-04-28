import { ArrowDown, Sparkles } from "lucide-react";
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

export function Hero() {
  const { siteConfig } = useSiteContent();
  const { photos } = usePublicPhotos();
  const { ref: parallaxRef, offset } = useParallax(0.25);

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
          className="hero-card hero-card-large"
          style={{ transform: `rotate(-2deg) translateY(${offset * 0.6}px)` }}
        >
          <ImageWithFallback
            src={mainPhoto.imageUrl}
            alt={mainPhoto.alt}
            title={mainPhoto.title}
            tone="sage"
            priority
          />
        </div>
        <div
          className="hero-card hero-card-small hero-card-top"
          style={{ transform: `rotate(6deg) translateY(${offset * -0.3}px)` }}
        >
          <ImageWithFallback
            src={topPhoto.imageUrl}
            alt={topPhoto.alt}
            title={topPhoto.title}
            tone="rose"
          />
        </div>
        <div
          className="hero-card hero-card-small hero-card-bottom"
          style={{ transform: `rotate(4deg) translateY(${offset * 0.4}px)` }}
        >
          <ImageWithFallback
            src={bottomPhoto.imageUrl}
            alt={bottomPhoto.alt}
            title={bottomPhoto.title}
            tone="cream"
          />
        </div>
      </div>
    </section>
  );
}
