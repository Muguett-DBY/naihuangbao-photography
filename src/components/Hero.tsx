import { ArrowDown, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Icon, Typewriter } from "animal-island-ui";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../hooks/useSiteContent";
import { useBookingModal } from "../hooks/useBookingModal";

export function Hero() {
  const { t } = useTranslation();
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

      <motion.div
        className="hero-cover-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
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
          <p className="hero-cover-intro">
            <Typewriter speed={50}>
              {t("hero.intro")}
            </Typewriter>
          </p>
        </div>

        <div className="hero-cover-right">
          <div className="hero-trust-tags">
            <span className="hero-trust-tag">
              <ShieldCheck size={13} />
              {t("hero.trustTags.privacy")}
            </span>
            <span className="hero-trust-tag">{t("hero.trustTags.guidance")}</span>
            <span className="hero-trust-tag">{t("hero.trustTags.styles")}</span>
          </div>
          <div className="hero-cover-cta-group">
            <Button type="primary" size="large" className="hero-cover-primary-btn" onClick={() => {
              document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
            }}>
              {t("hero.ctaView")}
              <ArrowDown size={16} />
            </Button>
            <Button type="primary" size="large" className="hero-cover-secondary-btn" onClick={() => openBookingModal()}>
              <MessageCircle size={14} />
              {t("hero.ctaBooking")}
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="hero-scroll-indicator" aria-hidden="true">
        <span>{t("hero.scroll")}</span>
        <div className="hero-scroll-line" />
      </div>
    </section>
  );
}
