import { ArrowDown, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { useGsapAnimations } from "../hooks/useGsapAnimations";
import { lazy } from "react";
const ParticleHero = lazy(() => import("./ParticleHero").then(m => ({ default: m.ParticleHero })));

export function Hero() {
  useGsapAnimations();
  const { siteConfig } = useSiteContent();

  return (
    <section id="top" className="hero">
      <ParticleHero />
      {/* Designed gradient background — replaces real photo */}
      <div className="hero-cover-design" />

      {/* Floating glow orbs — GSAP animated */}
      <div className="hero-glow-orb hero-glow-orb--1" aria-hidden="true" />
      <div className="hero-glow-orb hero-glow-orb--2" aria-hidden="true" />

      {/* Floating decorative elements */}
      <div className="float-element float-element--1" aria-hidden="true" />
      <div className="float-element float-element--2" aria-hidden="true" />
      <div className="float-element float-element--3" aria-hidden="true" />

      {/* Decorative SVG path — draws on scroll */}
      <svg className="deco-svg-path" viewBox="0 0 200 100" fill="none" aria-hidden="true">
        <path
          d="M 0 50 Q 50 0 100 50 T 200 50"
          stroke="rgba(255,210,184,0.15)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="hero-cover-content">
        <div className="hero-cover-left">
          <div className="hero-vol-badge">
            <Sparkles size={11} />
            <span>✦ Vol.1</span>
            {siteConfig.city}约拍
          </div>
          <h1 className="hero-magazine-title">
            {siteConfig.brandName}
            <span className="hero-magazine-subtitle">南京女生写真与情侣约拍</span>
          </h1>
          <p className="hero-cover-intro">
            把自然、柔和、带一点胶片感的日常，拍成可以反复翻看的南京记忆。适合第一次约拍的女生、情侣纪念和轻松的城市散步。
          </p>
        </div>

        <div className="hero-cover-right">
          <div className="hero-trust-tags">
            <span className="hero-trust-tag">
              <ShieldCheck size={13} />
              不默认公开客片
            </span>
            <span className="hero-trust-tag">全程动作引导</span>
            <span className="hero-trust-tag">江南 / 街拍 / 公园</span>
          </div>
          <div className="hero-cover-cta-group">
            <a className="hero-cover-primary-btn" href="#gallery">
              查看作品
              <ArrowDown size={16} />
            </a>
            <a className="hero-cover-secondary-btn" href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
              <MessageCircle size={14} />
              小红书预约
            </a>
          </div>
        </div>
      </div>

      <div className="hero-scroll-indicator" aria-hidden="true">
        <span>SCROLL</span>
        <div className="hero-scroll-line" />
      </div>
    </section>
  );
}
