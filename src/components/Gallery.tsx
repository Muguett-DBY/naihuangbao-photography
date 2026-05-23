import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [visiblePhotoIds, setVisiblePhotoIds] = useState<Set<string>>(() => new Set());
  const galleryGridRef = useRef<HTMLDivElement>(null);

  const photos = useMemo<PhotoItem[]>(() => getPhotosByStyle(sourcePhotos, filter), [sourcePhotos, filter]);

  useEffect(() => {
    void import("./Lightbox");
  }, []);

  useEffect(() => {
    const galleryGrid = galleryGridRef.current;
    if (!galleryGrid) return;

    if (!("IntersectionObserver" in window)) {
      setVisiblePhotoIds((currentIds) => {
        const nextIds = new Set(currentIds);
        let changed = false;
        photos.forEach((photo) => {
          if (!nextIds.has(photo.id)) {
            nextIds.add(photo.id);
            changed = true;
          }
        });
        return changed ? nextIds : currentIds;
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingPhotoIds = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.getAttribute("data-gallery-photo-id"))
          .filter((photoId): photoId is string => Boolean(photoId));

        if (intersectingPhotoIds.length === 0) return;

        setVisiblePhotoIds((currentIds) => {
          const nextIds = new Set(currentIds);
          let changed = false;
          intersectingPhotoIds.forEach((photoId) => {
            if (!nextIds.has(photoId)) {
              nextIds.add(photoId);
              changed = true;
            }
          });
          return changed ? nextIds : currentIds;
        });

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "200px" },
    );

    galleryGrid.querySelectorAll<HTMLElement>("[data-gallery-photo-id]").forEach((card) => {
      const photoId = card.getAttribute("data-gallery-photo-id");
      if (photoId && !visiblePhotoIds.has(photoId)) {
        observer.observe(card);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [photos, visiblePhotoIds]);

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
      <div className="gallery-story-panel" aria-label="作品风格说明">
        <div>
          <span>Portfolio</span>
          <strong>真实作品按风格整理，点击可看大图</strong>
        </div>
        <p>
          公园日常、江南感、城市街拍、室内写真和情侣约拍会分开筛选。这里只展示已授权公开的真实作品，不混入氛围图。
        </p>
      </div>
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
      <div className="gallery-grid" ref={galleryGridRef}>
        {photos.map((item, index) => {
          const isFeaturedGalleryCard = filter === "all" && index === 0;

          return (
            <article
              className={[
                "gallery-card",
                isFeaturedGalleryCard ? "gallery-card-featured" : "",
              ].filter(Boolean).join(" ")}
              data-gallery-photo-id={item.id}
              key={item.id}
              style={{ transitionDelay: `${index * 0.06}s` }}
            >
              <button
                className="gallery-card-btn"
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={`查看大图：${item.title}`}
              >
                <ImageWithFallback
                  src={item.imageUrl || ""}
                  alt={item.alt}
                  title={item.title}
                  tone={tones[index % tones.length]}
                  load={!item.imageUrl || visiblePhotoIds.has(item.id)}
                  sizes={
                    isFeaturedGalleryCard
                      ? "(max-width: 620px) 100vw, (max-width: 900px) 92vw, 50vw"
                      : "(max-width: 620px) 50vw, (max-width: 900px) 50vw, 33vw"
                  }
                />
                <div className="gallery-hover-overlay">
                  <span className="gallery-hover-style">{styleLabels[item.style]}</span>
                  <strong className="gallery-hover-title">{item.title}</strong>
                  <span className="gallery-hover-location">{item.location}</span>
                </div>
              </button>
              <div>
                <p>{styleLabels[item.style]}</p>
                <h3>{item.title}</h3>
                <span>{item.location}</span>
              </div>
            </article>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <Suspense
          fallback={
            <div className="lightbox-fallback" role="status" aria-live="polite">
              加载中...
            </div>
          }
        >
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
