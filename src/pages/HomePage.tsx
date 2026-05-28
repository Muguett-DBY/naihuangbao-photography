import { Suspense, lazy, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, CalendarCheck, Camera, BookOpen, Download, MapPin, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSiteContent } from "../hooks/useSiteContent";
import { PageTransition } from "../components/shared/PageTransition";

const Gallery = lazy(() => import("../components/Gallery").then((m) => ({ default: m.Gallery })));
const WhyChooseUs = lazy(() => import("../components/WhyChooseUs").then((m) => ({ default: m.WhyChooseUs })));
const Reviews = lazy(() => import("../components/Reviews").then((m) => ({ default: m.Reviews })));

export function HomePage() {
  const { t } = useTranslation();
  const { siteConfig } = useSiteContent();
  const { openBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);

  useGsapPageEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <div className="scroll-progress-bar" role="progressbar" aria-label={t("loading")} />

      {/* ── Hero ── */}
      <section className="hero" id="top">
        <div className="hero-cover-design" />
        <div className="hero-glow-orb hero-glow-orb--1" aria-hidden="true" />
        <div className="hero-glow-orb hero-glow-orb--2" aria-hidden="true" />
        <div className="float-element float-element--1" aria-hidden="true" />
        <div className="float-element float-element--2" aria-hidden="true" />
        <div className="float-element float-element--3" aria-hidden="true" />
        <svg className="deco-svg-path" viewBox="0 0 200 100" fill="none" aria-hidden="true">
          <path d="M 0 50 Q 50 0 100 50 T 200 50" stroke="rgba(255,210,184,0.15)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="hero-cover-content">
          <div className="hero-cover-left">
            <div className="hero-vol-badge">
              <Sparkles size={11} />
              <span>{t("hero.volBadge")}</span>
              {siteConfig.city}
            </div>
            <h1 className="hero-magazine-title">
              {siteConfig.brandName}
              <span className="hero-magazine-subtitle">{t("hero.brandPrefix")}</span>
            </h1>
            <p className="hero-cover-intro">{t("hero.intro")}</p>
          </div>
          <div className="hero-cover-right">
            <div className="hero-trust-tags">
              <span className="hero-trust-tag"><ShieldCheck size={13} /> {t("hero.trustTags.privacy")}</span>
              <span className="hero-trust-tag">{t("hero.trustTags.guidance")}</span>
              <span className="hero-trust-tag">{t("hero.trustTags.styles")}</span>
            </div>
            <div className="hero-cover-cta-group">
              <Button type="primary" size="large" className="hero-cover-primary-btn" onClick={() => document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" })}>
                {t("hero.ctaView")} <ArrowDown size={16} />
              </Button>
              <Button type="primary" size="large" className="hero-cover-secondary-btn" onClick={() => openBookingModal()}>
                <MessageCircle size={14} /> {t("hero.ctaBooking")}
              </Button>
            </div>
          </div>
        </div>
        <div className="hero-scroll-indicator" aria-hidden="true">
          <span>{t("hero.scroll")}</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── Gallery（组件自带 Section 标题，无需外层再包） ── */}
      <div id="featured" style={{ scrollMarginTop: 80 }}>
        <Suspense fallback={<div style={{ minHeight: 400 }} />}>
          <Gallery />
        </Suspense>
      </div>

      <div style={{ textAlign: "center", padding: "0 16px 40px" }}>
        <Link to="/gallery" className="home-page-link">
          {t("hero.ctaView")} <ArrowRight size={16} />
        </Link>
      </div>

      {/* ── 服务入口 ── */}
      <section className="section-shell is-visible" id="services-preview" style={{ padding: "60px 0" }}>
        <div className="section-heading" style={{ textAlign: "center", maxWidth: "100%", marginBottom: 32, paddingBottom: 0 }}>
          <p className="section-eyebrow">Services</p>
          <h2 style={{ clipPath: "inset(0 0 0 0)" }}>{t("nav.home")}</h2>
        </div>
        <div className="home-services-grid">
          <Link to="/courses" className="home-service-card">
            <BookOpen size={32} />
            <h3>{t("nav.courses")}</h3>
            <p>{t("courses.intro")}</p>
            <span className="home-service-link">了解更多 <ArrowRight size={14} /></span>
          </Link>
          <Link to="/products" className="home-service-card">
            <Download size={32} />
            <h3>{t("nav.presets")}</h3>
            <p>{t("presets.intro")}</p>
            <span className="home-service-link">了解更多 <ArrowRight size={14} /></span>
          </Link>
          <Link to="/workshops" className="home-service-card">
            <MapPin size={32} />
            <h3>{t("nav.workshops")}</h3>
            <p>{t("workshops.intro")}</p>
            <span className="home-service-link">了解更多 <ArrowRight size={14} /></span>
          </Link>
          <Link to="/shop" className="home-service-card">
            <Camera size={32} />
            <h3>{t("nav.shop")}</h3>
            <p>{t("merchandise.intro")}</p>
            <span className="home-service-link">了解更多 <ArrowRight size={14} /></span>
          </Link>
        </div>
      </section>

      {/* ── 为什么选择我们 ── */}
      <Suspense fallback={null}>
        <WhyChooseUs />
      </Suspense>

      {/* ── 评价 ── */}
      <Suspense fallback={null}>
        <Reviews />
      </Suspense>

      {/* ── CTA ── */}
      <section className="section-shell is-visible" style={{ textAlign: "center", padding: "60px 16px" }}>
        <h2 style={{ clipPath: "inset(0 0 0 0)", marginBottom: 12 }}>{t("midCTA.title")}</h2>
        <p style={{ color: "var(--caramel-muted)", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.7 }}>{t("midCTA.desc")}</p>
        <Button type="primary" size="large" onClick={() => openBookingModal()}>
          <CalendarCheck size={16} /> {t("midCTA.cta")}
        </Button>
      </section>
    </PageTransition>
  );
}
