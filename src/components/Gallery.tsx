import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { styleLabels } from "../data/site";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import { getPhotosByStyle } from "../lib/gallery";
import type { PhotoItem, PhotoStyle } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";
import { Section } from "./Section";

type StyleFilter = PhotoStyle | "all";

const filters = Object.keys(styleLabels) as StyleFilter[];
const tones = ["rose", "sage", "cream", "ink"] as const;
const Lightbox = lazy(() => import("./Lightbox"));

export function Gallery() {
  const { sectionCopy } = useSiteContent();
  const { photos: sourcePhotos } = usePublicPhotos();
  const [filter, setFilter] = useState<StyleFilter>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photos = useMemo<PhotoItem[]>(() => getPhotosByStyle(sourcePhotos, filter), [sourcePhotos, filter]);

  const handlePrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  return (
    <Section
      id="gallery"
      eyebrow={sectionCopy.gallery.eyebrow}
      title={sectionCopy.gallery.title}
      intro={sectionCopy.gallery.intro}
    >
      <div className="filter-row" role="group" aria-label="作品分类筛选">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === filter}
            className={item === filter ? "is-active" : ""}
            onClick={() => setFilter(item)}
          >
            {styleLabels[item]}
          </button>
        ))}
      </div>
      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <article className="gallery-card" key={photo.id} style={{ transitionDelay: `${index * 0.06}s` }}>
            <button
              className="gallery-card-btn"
              type="button"
              onClick={() => setLightboxIndex(index)}
              aria-label={`查看大图：${photo.title}`}
            >
              <ImageWithFallback
                src={photo.imageUrl || ""}
                alt={photo.alt}
                title={photo.title}
                tone={tones[index % tones.length]}
                sizes="(max-width: 620px) 50vw, (max-width: 900px) 50vw, 33vw"
              />
              <div className="gallery-hover-overlay">
                <span className="gallery-hover-style">{styleLabels[photo.style]}</span>
                <strong className="gallery-hover-title">{photo.title}</strong>
                <span className="gallery-hover-location">{photo.location}</span>
              </div>
            </button>
            <div>
              <p>{styleLabels[photo.style]}</p>
              <h3>{photo.title}</h3>
              <span>{photo.location}</span>
            </div>
          </article>
        ))}
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
