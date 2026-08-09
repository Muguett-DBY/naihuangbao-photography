import "../styles/about-booking.css";
import { Camera, CalendarCheck, ExternalLink, FlaskConical, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { useBookingModal } from "../features/booking/BookingContext";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSEO } from "../hooks/useSEO";
import { useSiteContent } from "../hooks/useSiteContent";
import type { WhyCardIcon } from "../types/content";

const ICONS = {
  heart: Heart,
  camera: Camera,
  message: MessageCircle,
  shield: ShieldCheck,
} satisfies Record<WhyCardIcon, typeof Heart>;

export function AboutPage() {
  const { t } = useTranslation();
  const { sectionCopy, siteConfig, whyCards } = useSiteContent();
  const { photos } = usePublicPhotos();
  const { openBookingModal, warmBookingModal } = useBookingModal();
  const portrait = photos.find((photo) => photo.visibility === "public" && photo.clientAuthorized);
  const secondaryPortrait = photos.find((photo) => photo.id !== portrait?.id && photo.visibility === "public");

  useSEO({ titleKey: "seo.aboutTitle", descKey: "seo.aboutDesc", path: "/about" });

  return (
    <PageTransition className="about-booking-page">
      <section className="about-booking-hero" aria-labelledby="about-title">
        <div className="about-booking-hero__copy">
          <p>{sectionCopy.about.eyebrow}</p>
          <h1 id="about-title">{sectionCopy.about.title}</h1>
          <strong>{t("aboutPage.role")}</strong>
          <span>{sectionCopy.about.body}</span>
          <div className="about-booking-actions">
            <button
              type="button"
              onClick={() => openBookingModal()}
              onFocus={warmBookingModal}
              onPointerEnter={warmBookingModal}
            >
              <CalendarCheck size={18} aria-hidden="true" />
              {t("nav.booking")}
            </button>
            <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
              <ExternalLink size={17} aria-hidden="true" />
              {sectionCopy.about.profileLinkLabel}
            </a>
          </div>
        </div>
        <div className="about-booking-hero__media">
          {portrait ? (
            <ImageWithFallback
              src={portrait.imageUrl}
              alt={portrait.alt}
              title={portrait.title}
              priority
              sizes="(max-width: 760px) 100vw, 52vw"
              tone="cream"
            />
          ) : null}
          <span aria-hidden="true">{siteConfig.city} / PORTRAIT</span>
        </div>
      </section>

      <section className="about-booking-trust" aria-labelledby="about-trust-title">
        <header>
          <p>{sectionCopy.why.eyebrow}</p>
          <h2 id="about-trust-title">{sectionCopy.why.title}</h2>
          <span>{sectionCopy.why.intro}</span>
        </header>
        <div className="about-booking-trust__list">
          {whyCards.slice(0, 4).map((item, index) => {
            const Icon = ICONS[item.icon];
            return (
              <article key={`${item.title}-${index}`}>
                <span><Icon size={21} aria-hidden="true" />{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="about-booking-contact" aria-labelledby="about-contact-title">
        <div className="about-booking-contact__media">
          {secondaryPortrait ? (
            <ImageWithFallback
              src={secondaryPortrait.imageUrl}
              alt={secondaryPortrait.alt}
              title={secondaryPortrait.title}
              sizes="(max-width: 760px) 100vw, 45vw"
              tone="cream"
            />
          ) : null}
        </div>
        <div className="about-booking-contact__copy">
          <p>{sectionCopy.about.intro}</p>
          <h2 id="about-contact-title">{sectionCopy.about.bookingTitle}</h2>
          <span>{t("aboutPage.bookingDesc")}</span>
          <button type="button" onClick={() => openBookingModal()}>
            <CalendarCheck size={18} aria-hidden="true" />
            {t("bookingPage.startBooking")}
          </button>
          <PrefetchLink to="/practice" className="about-booking-practice-link">
            <FlaskConical size={16} aria-hidden="true" />
            {t("aboutPage.practiceLink")}
          </PrefetchLink>
        </div>
      </section>
    </PageTransition>
  );
}
