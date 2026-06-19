import "../styles/pages.css";
import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, CalendarCheck, BookOpen, Download, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Divider, Icon } from "animal-island-ui";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSiteContent } from "../hooks/useSiteContent";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SectionSkeleton } from "../components/SectionSkeleton";
import { PhotoOfTheDay } from "../components/PhotoOfTheDay";
import { RecentlyViewedStrip } from "../components/RecentlyViewedStrip";
import { useReveal } from "../hooks/useReveal";

gsap.registerPlugin(ScrollTrigger);

const Gallery = lazy(() => import("../components/Gallery").then((m) => ({ default: m.Gallery })));
const WhyChooseUs = lazy(() => import("../components/WhyChooseUs").then((m) => ({ default: m.WhyChooseUs })));
const Reviews = lazy(() => import("../components/Reviews").then((m) => ({ default: m.Reviews })));
const FilmStripStory = lazy(() =>
  import("../components/FilmStripStory").then((m) => ({ default: m.FilmStripStory }))
);
const StyleQuiz = lazy(() => import("../components/StyleQuiz").then((m) => ({ default: m.StyleQuiz })));

function scrollToSection(id: string) {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  document.getElementById(id)?.scrollIntoView({ behavior });
}

export function HomePage() {
  const { t } = useTranslation();
  const { siteConfig } = useSiteContent();
  const { openBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const collageRef = useRef<HTMLDivElement>(null);
  const servicesRef = useReveal<HTMLDivElement>();

  const { photos } = usePublicPhotos();

  const collagePhotos = useMemo(
    () => photos.filter((p) => p.visibility === "public").slice(0, 6),
    [photos],
  );

  useSEO({ titleKey: "seo.homeTitle", descKey: "seo.homeDesc", path: "/" });
  useGsapPageEffects(rootRef);

  // Hero entrance animation
  useEffect(() => {
    const hero = rootRef.current?.querySelector(".hero-cover-content");
    if (!hero) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const children = hero.children;
    gsap.fromTo(children,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power3.out", delay: 0.2 }
    );
  }, []);

  useEffect(() => {
    if (!collageRef.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const imgs = collageRef.current.querySelectorAll<HTMLElement>(".hero-collage-photo");
    imgs.forEach((img, i) => {
      const speed = [0.15, -0.1, 0.2, -0.18, 0.12, -0.08][i] ?? 0.1;
      gsap.to(img, {
        y: () => speed * ScrollTrigger.maxScroll(window) * 0.3,
        ease: "none",
        scrollTrigger: {
          trigger: collageRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars?.trigger === collageRef.current) t.kill();
      });
    };
  }, [collagePhotos]);

  return (
    <PageTransition ref={rootRef}>
      <div className="scroll-progress-bar" role="progressbar" aria-label={t("loading")} />

      {/* ── Hero ── */}
      <section className="hero" id="top">
        <div className="hero-cover-design" />
        <div className="hero-photo-collage" ref={collageRef} aria-hidden="true">
          {collagePhotos.map((photo, i) => (
            <div key={photo.id} className="hero-collage-photo">
              <img src={photo.imageUrl} alt="" loading={i < 3 ? "eager" : "lazy"} fetchPriority={i < 2 ? "high" : "auto"} />
            </div>
          ))}
        </div>
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
              <Button type="primary" size="large" className="hero-cover-primary-btn" onClick={() => openBookingModal()}>
                <CalendarCheck size={16} /> {t("hero.ctaBooking")}
              </Button>
              <Button type="primary" size="large" className="hero-cover-secondary-btn" onClick={() => scrollToSection("featured")}>
                {t("hero.ctaView")} <ArrowDown size={16} />
              </Button>
            </div>
          </div>
        </div>
        <div className="hero-scroll-indicator" aria-hidden="true">
          <span>{t("hero.scroll")}</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── Film Strip Story ── */}
      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={3} hasImage />}>
          <FilmStripStory />
        </Suspense>
      </ErrorBoundary>

      {/* ── Photo of the day ── */}
      <PhotoOfTheDay />

      {/* ── Continue browsing (only if user has history) ── */}
      <RecentlyViewedStrip />

      {/* ── Gallery（组件自带 Section 标题，无需外层再包） ── */}
      <div id="featured" style={{ scrollMarginTop: 80 }}>
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton hasCards={3} />}>
            <Gallery />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div style={{ textAlign: "center", padding: "0 16px 40px" }}>
        <Link to="/gallery" className="home-page-link">
          {t("hero.ctaView")} <ArrowRight size={16} />
        </Link>
      </div>

      <Divider type="wave-yellow" />

      {/* ── 服务入口 ── */}
      <section className="section-shell is-visible" id="services-preview" style={{ padding: "60px 0" }}>
        <div className="section-heading" style={{ textAlign: "center", maxWidth: "100%", marginBottom: 32, paddingBottom: 0 }}>
          <p className="section-eyebrow">{t("home.servicesTitle")}</p>
          <h2 style={{ clipPath: "inset(0 0 0 0)" }}>{t("home.servicesTitle")}</h2>
        </div>
        <div className="home-services-grid" ref={servicesRef}>
          <Link to="/courses" className="home-service-card">
            <BookOpen size={32} />
            <h3>{t("nav.courses")}</h3>
            <p>{t("courses.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={14} /></span>
          </Link>
          <Link to="/products" className="home-service-card">
            <Download size={32} />
            <h3>{t("nav.presets")}</h3>
            <p>{t("presets.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={14} /></span>
          </Link>
          <Link to="/workshops" className="home-service-card">
            <Icon name="icon-map" size={32} />
            <h3>{t("nav.workshops")}</h3>
            <p>{t("workshops.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={14} /></span>
          </Link>
          <Link to="/shop" className="home-service-card">
            <Icon name="icon-camera" size={32} />
            <h3>{t("nav.shop")}</h3>
            <p>{t("merchandise.intro")}</p>
            <span className="home-service-link">{t("common.learnMore")} <ArrowRight size={14} /></span>
          </Link>
        </div>
      </section>

      {/* ── 为什么选择我们 ── */}
      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton hasCards={3} />}>
          <WhyChooseUs />
        </Suspense>
      </ErrorBoundary>

      {/* ── 评价 ── */}
      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton lines={4} />}>
          <Reviews />
        </Suspense>
      </ErrorBoundary>

      <Divider type="wave-yellow" />

      {/* ── 风格测试 ── */}
      <section className="section-shell is-visible" style={{ padding: "60px 0" }}>
        <div className="section-heading" style={{ textAlign: "center", maxWidth: "100%", marginBottom: 32, paddingBottom: 0 }}>
          <p className="section-eyebrow">{t("home.styleQuizTitle")}</p>
          <h2 style={{ clipPath: "inset(0 0 0 0)" }}>{t("quiz.step1.title")}</h2>
          <span>{t("quiz.result.desc")}</span>
        </div>
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton lines={3} />}>
            <StyleQuiz />
          </Suspense>
        </ErrorBoundary>
      </section>

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
