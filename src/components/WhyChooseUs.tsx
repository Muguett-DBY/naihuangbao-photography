import { useMemo, useState } from "react";
import { ArrowUpRight, Camera, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import type { WhyCardIcon } from "../types/content";
import { ImageWithFallback } from "./ImageWithFallback";

const icons: Record<WhyCardIcon, typeof Heart> = {
  heart: Heart,
  camera: Camera,
  message: MessageCircle,
  shield: ShieldCheck,
};

export function WhyChooseUs() {
  const { sectionCopy, whyCards } = useSiteContent();
  const { photos } = usePublicPhotos();
  const [activeIndex, setActiveIndex] = useState(0);

  const mediaPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, 4),
    [photos],
  );
  const activeCard = whyCards[activeIndex] ?? whyCards[0];
  const activeMediaIndex = mediaPhotos.length > 0 ? activeIndex % mediaPhotos.length : 0;

  return (
    <section id="why" className="why-editorial" data-motion-group>
      <header className="why-editorial-heading" data-motion-item>
        <p>{sectionCopy.why.eyebrow}</p>
        <div>
          <h2>{sectionCopy.why.title}</h2>
          <span>{sectionCopy.why.intro}</span>
        </div>
      </header>

      <div className="why-editorial-layout" data-motion-item>
        <div className="why-editorial-media">
          {mediaPhotos.map((photo, index) => (
            <div
              className={index === activeMediaIndex ? "why-editorial-frame is-active" : "why-editorial-frame"}
              key={photo.id}
              aria-hidden={index !== activeMediaIndex}
            >
              <ImageWithFallback
                src={photo.imageUrl}
                alt={index === activeMediaIndex ? photo.alt : ""}
                title={photo.title}
                tone="ink"
                priority={index === 0}
                sizes="(max-width: 900px) 100vw, 48vw"
              />
            </div>
          ))}
          {activeCard ? (
            <div className="why-editorial-media-caption">
              <span>{String(activeIndex + 1).padStart(2, "0")}</span>
              <p>{activeCard.title}</p>
            </div>
          ) : null}
        </div>

        <div className="why-grid">
          {whyCards.map((card, index) => {
            const Icon = icons[card.icon];
            const isActive = index === activeIndex;
            return (
              <button
                type="button"
                className={isActive ? "why-card is-active" : "why-card"}
                key={card.title}
                aria-pressed={isActive}
                onPointerEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              >
                <span className="why-card-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="why-icon"><Icon size={21} aria-hidden="true" /></span>
                <span className="why-card-copy">
                  <strong>{card.title}</strong>
                  <span>{card.detail}</span>
                </span>
                <ArrowUpRight className="why-card-arrow" size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
