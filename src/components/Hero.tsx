import { ArrowDown, Sparkles } from "lucide-react";
import { siteConfig } from "../data/site";
import { FilmPlaceholder } from "./FilmPlaceholder";

export function Hero() {
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
          <FilmPlaceholder title="南京柔雾写真" tone="rose" />
        </div>
        <div className="hero-card hero-card-small hero-card-top">
          <FilmPlaceholder title="江南感" tone="sage" />
        </div>
        <div className="hero-card hero-card-small hero-card-bottom">
          <FilmPlaceholder title="情侣纪念" tone="cream" />
        </div>
      </div>
    </section>
  );
}
