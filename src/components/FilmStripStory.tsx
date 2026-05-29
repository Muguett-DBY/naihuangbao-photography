import { useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePublicPhotos } from "../hooks/usePublicPhotos";

gsap.registerPlugin(ScrollTrigger);

const CAPTION_COUNT = 8;

export function FilmStripStory() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  const displayPhotos = useMemo(() => {
    if (photos.length === 0) return [];
    const selected = [];
    const step = Math.max(1, Math.floor(photos.length / CAPTION_COUNT));
    for (let i = 0; i < CAPTION_COUNT && i * step < photos.length; i++) {
      selected.push(photos[i * step]);
    }
    return selected;
  }, [photos]);

  const captions = useMemo(() => {
    const result: string[] = [];
    for (let i = 1; i <= CAPTION_COUNT; i++) {
      result.push(t(`filmstrip.caption${i}` as never));
    }
    return result;
  }, [t]);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || displayPhotos.length === 0) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const totalWidth = track.scrollWidth - window.innerWidth;

      const scrollTween = gsap.to(track, {
        x: -totalWidth,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const bar = section.querySelector<HTMLElement>(".filmstrip-progress-bar");
            if (bar) bar.style.width = `${(self.progress * 100).toFixed(1)}%`;
          },
        },
      });

      itemsRef.current.forEach((item, i) => {
        if (!item) return;
        gsap.fromTo(
          item,
          { opacity: 0, x: 80 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              containerAnimation: scrollTween,
              start: "left 85%",
              end: "left 50%",
              scrub: 0.5,
            },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, [displayPhotos]);

  return (
    <section className="filmstrip-story" ref={sectionRef}>
      <div className="filmstrip-heading">
        <span className="filmstrip-eyebrow">Our Story</span>
        <h2 className="filmstrip-title">{t("filmstrip.title" as never)}</h2>
      </div>

      <div className="filmstrip-container">
        <div className="filmstrip-sticky">
          <div className="filmstrip-track" ref={trackRef}>
            {displayPhotos.map((photo, i) => (
              <div
                key={photo.id}
                className="filmstrip-item"
                ref={(el) => { itemsRef.current[i] = el!; }}
              >
                <div className="filmstrip-photo-frame">
                  <img
                    className="filmstrip-photo"
                    src={photo.imageUrl}
                    alt={photo.alt}
                    width={400}
                    height={533}
                    loading={i < 3 ? "eager" : "lazy"}
                  />
                  <div className="filmstrip-photo-overlay" aria-hidden="true" />
                </div>
                <div className="filmstrip-caption">
                  <span className="filmstrip-caption-number">
                    {String(i + 1).padStart(2, "0")} / {String(CAPTION_COUNT).padStart(2, "0")}
                  </span>
                  <p className="filmstrip-caption-text">{captions[i]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="filmstrip-progress" aria-hidden="true">
        <div className="filmstrip-progress-bar" />
      </div>
      <div className="filmstrip-grain" aria-hidden="true" />
    </section>
  );
}
