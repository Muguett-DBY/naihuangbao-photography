import { ArrowDown, Sparkles } from "lucide-react";
import { galleryItems } from "../data/gallery";
import { siteConfig } from "../data/site";
import { ImageWithFallback } from "./ImageWithFallback";

export function Hero() {
  const [mainPhoto, topPhoto, bottomPhoto] = [galleryItems[2], galleryItems[0], galleryItems[4]];

  return (
    <section id="top" className="hero">
      <div className="hero-copy">
        <p className="kicker">
          <Sparkles size={16} />
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
        <div className="hero-card hero-card-large">
          <ImageWithFallback
            src={mainPhoto.imageUrl}
            alt={mainPhoto.alt}
            title={mainPhoto.title}
            tone="sage"
          />
        </div>
        <div className="hero-card hero-card-small hero-card-top">
          <ImageWithFallback
            src={topPhoto.imageUrl}
            alt={topPhoto.alt}
            title={topPhoto.title}
            tone="rose"
          />
        </div>
        <div className="hero-card hero-card-small hero-card-bottom">
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
