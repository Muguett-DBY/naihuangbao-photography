import { ArrowDown, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Icon, Typewriter } from "animal-island-ui";
import { useSiteContent } from "../hooks/useSiteContent";
import { useBookingModal } from "../hooks/useBookingModal";

export function Hero() {
  const { siteConfig } = useSiteContent();
  const { openBookingModal } = useBookingModal();

  return (
    <section id="top" className="hero">
      {/* Designed gradient background — replaces real photo */}
      <div className="hero-cover-design" />

      {/* Floating glow orbs — GSAP animated */}
      <div className="hero-glow-orb hero-glow-orb--1" aria-hidden="true" />
      <div className="hero-glow-orb hero-glow-orb--2" aria-hidden="true" />

      {/* Floating decorative elements */}
      <div className="float-element float-element--1" aria-hidden="true" />
      <div className="float-element float-element--2" aria-hidden="true" />
      <div className="float-element float-element--3" aria-hidden="true" />
      <div className="float-element float-element--icon" aria-hidden="true">
        <Icon name="icon-camera" size={28} bounce />
      </div>

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
            <Typewriter speed={50}>
              把自然、柔和、带一点胶片感的日常，拍成可以反复翻看的南京记忆。适合第一次约拍的女生、情侣纪念和轻松的城市散步。
            </Typewriter>
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
            <Button type="primary" size="large" className="hero-cover-primary-btn" onClick={() => {
              document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
            }}>
              查看作品
              <ArrowDown size={16} />
            </Button>
            <Button type="primary" size="large" className="hero-cover-secondary-btn" onClick={() => openBookingModal()}>
              <MessageCircle size={14} />
              预约
            </Button>
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
