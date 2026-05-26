import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import { getPhotosByStyle } from "../lib/gallery";
import type { PhotoItem, PhotoStyle } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";
import { Section } from "./Section";
import { useDistortionHover } from "../hooks/useDistortionHover";

type StyleFilter = PhotoStyle | "all";

const STYLE_FILTERS: StyleFilter[] = ["all", "jiangnan", "street", "park", "sweet", "couple", "indoor"];
const tones = ["rose", "sage", "cream", "ink"] as const;
const Lightbox = lazy(() => import("./Lightbox"));
const galleryThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

export function Gallery() {
  const { t } = useTranslation();
  const { sectionCopy } = useSiteContent();
  const { photos: sourcePhotos } = usePublicPhotos();
  const [filter, setFilter] = useState<StyleFilter>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const masonryRef = useRef<HTMLDivElement>(null);

  // Distortion hover on gallery cards
  const distortRef = useDistortionHover();

  const photos = useMemo<PhotoItem[]>(() => getPhotosByStyle(sourcePhotos, filter), [sourcePhotos, filter]);

  const handlePrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  useEffect(() => {
    const target = masonryRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        void import("./Lightbox");
        observer.disconnect();
      },
      { rootMargin: "300px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <Section
      id="gallery"
      eyebrow={sectionCopy.gallery.eyebrow}
      title={sectionCopy.gallery.title}
      intro={sectionCopy.gallery.intro}
    >
      <div ref={distortRef} className="gallery-story-panel" aria-label={t("gallery.intro")}>
        <div>
          <span>{t("gallery.eyebrow")}</span>
          <strong>{t("gallery.intro")}</strong>
        </div>
        <p>{t("gallery.description")}</p>
      </div>

      <div className="filter-row" role="group" aria-label={t("gallery.intro")}>
        {STYLE_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === filter}
            className={item === filter ? "is-active" : ""}
            onClick={() => setFilter(item)}
          >
            {t(`gallery.filters.${item}`)}
          </button>
        ))}
      </div>

      {/* Filmstrip: auto-scrolling photo strip */}
      <div className="gallery-filmstrip-wrap" aria-hidden="true">
        <div className="gallery-auto-scroll" data-scroll-speed="0.25">
          {photos.slice(0, 6).map((photo) => (
            <div className="gallery-filmstrip-item" key={photo.id}>
              <img
                src={galleryThumb(photo.imageUrl || "")}
                alt=""
                loading="lazy"
                fetchPriority="low"
                width={120}
                height={90}
              />
            </div>
          ))}
        </div>
      </div>

      <div ref={masonryRef}>
        {/* Album groupings */}
        {(() => {
          const albums = new Map<string, typeof photos>();
          for (const p of photos) {
            const key = p.album || "其他";
            if (!albums.has(key)) albums.set(key, []);
            albums.get(key)!.push(p);
          }
          return Array.from(albums).map(([albumName, albumPhotos]) => (
            <div key={albumName} className="gallery-album">
              <h3 className="gallery-album-title">{albumName}</h3>
              <div className="gallery-masonry">
                {albumPhotos.map((item, index) => (
                  <article
                    className="gallery-masonry-item"
                    data-gallery-photo-id={item.id}
                    key={item.id}
                    style={{ transitionDelay: `${index * 0.06}s` }}
                  >
                    <button
                      className="gallery-masonry-btn"
                      type="button"
                      data-distort
                      onClick={() => setLightboxIndex(photos.indexOf(item))}
                      onTouchStart={() => {
                        const timer = setTimeout(() => navigator.vibrate?.(12), 400);
                        const clear = () => { clearTimeout(timer); };
                        document.addEventListener("touchend", clear, { once: true });
                        document.addEventListener("touchmove", clear, { once: true });
                      }}
                      aria-label={`查看大图：${item.title}`}
                    >
                      <ImageWithFallback
                        src={item.imageUrl || ""}
                        alt={item.alt}
                        title={item.title}
                        tone={tones[photos.indexOf(item) % tones.length]}
                        load={true}
                        priority={photos.indexOf(item) < 6 || item.id === "gallery-daily-01"}
                        sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
                      />
                      <div className="gallery-masonry-overlay">
                        <span className="gallery-masonry-overlay-style">{t(`gallery.filters.${item.style}`, item.style)}</span>
                        <strong className="gallery-masonry-overlay-title">{item.title}</strong>
                        <span className="gallery-masonry-overlay-location">{item.location}</span>
                      </div>
                    </button>
                    <div className="gallery-masonry-caption">
                      <p>{t(`gallery.filters.${item.style}`, item.style)}</p>
                      <h3>{item.title}</h3>
                      <span>{item.location}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {lightboxIndex !== null && (
        <Suspense fallback={null}>
          <Lightbox
            photos={photos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </Suspense>
      )}
    </Section>
  );
}
