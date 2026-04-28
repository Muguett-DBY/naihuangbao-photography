import { useCallback, useEffect, useMemo, useState } from "react";
import { galleryItems } from "../data/gallery";
import { styleLabels } from "../data/site";
import { getPhotosByStyle } from "../lib/gallery";
import type { PhotoItem, PhotoStyle } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";
import { Lightbox } from "./Lightbox";
import { Section } from "./Section";

type StyleFilter = PhotoStyle | "all";

const filters = Object.keys(styleLabels) as StyleFilter[];
const tones = ["rose", "sage", "cream", "ink"] as const;

export function Gallery() {
  const [filter, setFilter] = useState<StyleFilter>("all");
  const [remotePhotos, setRemotePhotos] = useState<PhotoItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sourcePhotos = useMemo(() => {
    if (remotePhotos.length === 0) return galleryItems;
    const remoteIds = new Set(remotePhotos.map((p) => p.id));
    const filteredStatic = galleryItems.filter((p) => !remoteIds.has(p.id));
    return [...remotePhotos, ...filteredStatic];
  }, [remotePhotos]);

  const photos = useMemo<PhotoItem[]>(() => getPhotosByStyle(sourcePhotos, filter), [sourcePhotos, filter]);

  useEffect(() => {
    let ignore = false;
    async function loadRemotePhotos() {
      try {
        const response = await fetch("/api/photos");
        if (!response.ok) return;
        const data = (await response.json()) as { photos?: PhotoItem[] };
        if (!ignore && Array.isArray(data.photos)) {
          setRemotePhotos(data.photos);
        }
      } catch {
        // Local Vite dev has no Pages Functions; static placeholders remain visible.
      }
    }
    void loadRemotePhotos();
    return () => { ignore = true; };
  }, []);

  const handlePrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  return (
    <Section
      id="gallery"
      eyebrow="Gallery"
      title="作品像一本慢慢翻开的相册"
      intro="以下是不同风格的作品参考，点击可以查看大图。"
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
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </Section>
  );
}
