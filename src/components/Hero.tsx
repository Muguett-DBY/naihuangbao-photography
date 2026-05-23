import { ArrowDown, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import { styleLabels } from "../data/site";
import { ImageWithFallback } from "./ImageWithFallback";

export function Hero() {
  const { siteConfig } = useSiteContent();
  const { photos } = usePublicPhotos();
  const featuredPhotos = photos.filter((photo) => photo.imageUrl).slice(0, 4);

  return (
    <section id="top" className="hero">
      <div className="hero-copy">
        <p className="kicker">
          <Sparkles size={15} />
          {siteConfig.city}约拍 · 柔雾胶片感日常记录
        </p>
        <h1>
          {siteConfig.brandName}｜
          <span>南京女生写真与情侣约拍</span>
        </h1>
        <p className="hero-intro">
          把自然、柔和、带一点胶片感的日常，拍成可以反复翻看的南京记忆。适合第一次约拍的女生、情侣纪念和轻松的城市散步。
        </p>
        <ul className="hero-trust-list" aria-label="约拍安心承诺">
          <li><ShieldCheck size={15} />不默认公开客片</li>
          <li>全程动作与表情引导</li>
          <li>江南感 / 公园日常 / 城市街拍</li>
        </ul>
        <div className="hero-actions">
          <a className="primary-button" href="#gallery">
            查看作品
            <ArrowDown size={16} />
          </a>
          <a className="text-button hero-xhs-button" href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
            <MessageCircle size={16} />
            小红书私信预约
          </a>
        </div>
      </div>
      <div className="hero-visual" aria-label="奶黄包摄影作品预览">
        <div className="hero-portfolio-stage">
          {featuredPhotos.map((photo, index) => (
            <figure className={`hero-photo-card hero-photo-card-${index + 1}`} key={photo.id}>
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                tone={index % 2 === 0 ? "cream" : "rose"}
                priority={index === 0}
                sizes={index === 0 ? "(max-width: 900px) 86vw, 38vw" : "(max-width: 900px) 42vw, 18vw"}
              />
              <figcaption>
                <span>{styleLabels[photo.style]}</span>
                {photo.title}
              </figcaption>
            </figure>
          ))}
          <div className="hero-note-card">
            <span>Privacy first</span>
            <strong>未经明确授权不会公开客片</strong>
          </div>
        </div>
      </div>
      <a className="hero-scroll-cue" href="#gallery" aria-label="向下滚动到作品">
        <ArrowDown size={18} />
      </a>
    </section>
  );
}
