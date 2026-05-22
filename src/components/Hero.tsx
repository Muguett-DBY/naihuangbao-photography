import { ArrowDown, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import { selectCinematicPhotos } from "../lib/cinematic-gallery";
import { CinematicGalleryScene } from "./CinematicGalleryScene";

export function Hero() {
  const { siteConfig } = useSiteContent();
  const { photos } = usePublicPhotos();
  const cinematicPhotos = useMemo(() => selectCinematicPhotos(photos), [photos]);

  return (
    <section id="top" className="hero">
      <div className="hero-visual" aria-label="暖色宠物影棚与胶片作品预览">
        <CinematicGalleryScene photos={cinematicPhotos} mode="hero" />
      </div>
      <div className="hero-copy">
        <p className="kicker">
          <Sparkles size={15} />
          {siteConfig.brandName} · {siteConfig.city}约拍
        </p>
        <h1>
          南京女生写真
          <span>与情侣约拍</span>
        </h1>
        <p className="hero-intro">
          <strong>奶黄包摄影</strong>
          把柔软的日常拍成有呼吸感的纪念。{siteConfig.description}
        </p>
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
      <a className="hero-scroll-cue" href="#gallery" aria-label="向下滚动到作品">
        <ArrowDown size={18} />
      </a>
    </section>
  );
}
