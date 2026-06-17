import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Share2, Loader2, Search, X } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import { getPhotosByStyle, searchPhotos } from "../lib/gallery";
import type { PhotoItem, PhotoStyle } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";
import { Section } from "./Section";
import { HighlightText } from "./shared/HighlightText";
import { useDistortionHover } from "../hooks/useDistortionHover";

type StyleFilter = PhotoStyle | "all";

const STYLE_FILTERS: StyleFilter[] = ["all", "jiangnan", "street", "park", "sweet", "couple", "indoor"];
const tones = ["rose", "sage", "cream", "ink"] as const;
const PAGE_SIZE = 12;
const Lightbox = lazy(() => import("./Lightbox"));
const galleryThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

function VideoPreview({ videoUrl, posterUrl, title }: { videoUrl: string; posterUrl: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="gallery-video-wrap"
      onMouseEnter={() => {
        setHovering(true);
        videoRef.current?.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setHovering(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }}
    >
      {!hovering && (
        <ImageWithFallback
          src={posterUrl}
          alt={title}
          title={title}
          tone="cream"
          load={true}
          priority={false}
          sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
        />
      )}
      <video
        ref={videoRef}
        className={`gallery-video-preview ${hovering ? "is-playing" : ""}`}
        src={videoUrl}
        poster={posterUrl}
        muted
        loop
        playsInline
        preload="none"
        aria-label={title}
      />
      <span className="gallery-video-badge">
        <Play size={12} />
      </span>
    </div>
  );
}

function ShareButton({ photo }: { photo: PhotoItem }) {
  const { t } = useTranslation();

  const handleShare = useCallback(async () => {
    const shareData = {
      title: photo.title,
      text: `${photo.title} — ${photo.location}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert(t("gallery.linkCopied"));
      }
    } catch {
      // user cancelled share or clipboard failed silently
    }
  }, [photo, t]);

  return (
    <span
      role="button"
      tabIndex={0}
      className="gallery-share-btn"
      onClick={(e) => {
        e.stopPropagation();
        void handleShare();
      }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void handleShare(); } }}
      aria-label={t("gallery.share")}
      title={t("gallery.share")}
    >
      <Share2 size={16} />
    </span>
  );
}

export function Gallery() {
  const { t } = useTranslation();
  const { sectionCopy } = useSiteContent();
  const { photos: sourcePhotos } = usePublicPhotos();
  const [filter, setFilter] = useState<StyleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const masonryRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Distortion hover on gallery cards
  const distortRef = useDistortionHover();

  // Compute filter counts for each style
  const filterCounts = useMemo(() => {
    const counts: Record<StyleFilter, number> = {
      all: sourcePhotos.length,
      jiangnan: 0,
      street: 0,
      park: 0,
      sweet: 0,
      couple: 0,
      indoor: 0,
    };
    for (const photo of sourcePhotos) {
      if (photo.style in counts) {
        counts[photo.style as StyleFilter]++;
      }
    }
    return counts;
  }, [sourcePhotos]);

  const styleFiltered = useMemo<PhotoItem[]>(() => getPhotosByStyle(sourcePhotos, filter), [sourcePhotos, filter]);
  const photos = useMemo<PhotoItem[]>(() => searchPhotos(styleFiltered, searchQuery), [styleFiltered, searchQuery]);

  // Reset visible count when filter or search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, searchQuery]);

  const visiblePhotos = useMemo(() => photos.slice(0, visibleCount), [photos, visibleCount]);
  const hasMore = visibleCount < photos.length;

  // Build index lookup map to avoid O(n^2) indexOf in render loop
  const photoIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [photos]);

  // Lazy-load Lightbox on mount
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

  // Infinite scroll: observe sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  // Haptic touch feedback with proper cleanup
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchCleanupRef = useRef<(() => void) | null>(null);

  const handleTouchStart = useCallback(() => {
    touchCleanupRef.current?.();
    touchTimerRef.current = setTimeout(() => navigator.vibrate?.(12), 400);
    const clear = () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      document.removeEventListener("touchend", clear);
      document.removeEventListener("touchmove", clear);
      touchCleanupRef.current = null;
    };
    touchCleanupRef.current = clear;
    document.addEventListener("touchend", clear, { passive: true });
    document.addEventListener("touchmove", clear, { passive: true });
  }, []);

  useEffect(() => {
    return () => {
      touchCleanupRef.current?.();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    };
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

      <div className="gallery-search-row">
        <div className="gallery-search-wrap">
          <Search size={16} className="gallery-search-icon" />
          <input
            ref={searchInputRef}
            type="search"
            className="gallery-search-input"
            placeholder={t("gallery.searchPlaceholder", "Search by title, location, style...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t("gallery.searchPlaceholder", "Search photos")}
          />
          {searchQuery && (
            <button
              type="button"
              className="gallery-search-clear"
              onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
              aria-label={t("gallery.clearSearch", "Clear search")}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {photos.length === 0 && !searchQuery && (
          <span className="gallery-search-count">{t("gallery.noResults", "No results")}</span>
        )}
        {searchQuery && (
          <span className="gallery-search-count">
            {t("gallery.resultCount", { count: photos.length, defaultValue: `${photos.length} photos` })}
          </span>
        )}
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
            <span className="filter-count">{filterCounts[item]}</span>
          </button>
        ))}
      </div>

      <div className="gallery-result-summary">
        <span className="gallery-result-count">
          {t("gallery.showing", { count: photos.length, total: sourcePhotos.length, defaultValue: `Showing ${photos.length} of ${sourcePhotos.length} photos` })}
        </span>
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
          const albums = new Map<string, typeof visiblePhotos>();
          for (const p of visiblePhotos) {
            const key = p.album || t("gallery.otherAlbum");
            if (!albums.has(key)) albums.set(key, []);
            albums.get(key)!.push(p);
          }
          return Array.from(albums).map(([albumName, albumPhotos]) => (
            <div key={albumName} className="gallery-album">
              <div className="gallery-album-header">
                <h3 className="gallery-album-title">{albumName}</h3>
                <span className="gallery-album-count">{albumPhotos.length} {t("gallery.photos", "photos")}</span>
              </div>
              <div className="gallery-masonry">
                {albumPhotos.map((item, index) => {
                  const isVideo = Boolean(item.videoUrl);
                  return (
                    <article
                      className={`gallery-masonry-item ${isVideo ? "is-video" : ""}`}
                      data-gallery-photo-id={item.id}
                      key={item.id}
                      style={{ transitionDelay: `${index * 0.06}s` }}
                    >
                      <button
                        className="gallery-masonry-btn"
                        type="button"
                        data-distort
                        onClick={() => setLightboxIndex(photoIndexMap.get(item.id) ?? 0)}
                        onTouchStart={handleTouchStart}
                        aria-label={`${t("gallery.viewLargeImage")}${item.title}`}
                      >
                        {isVideo && item.videoUrl ? (
                          <VideoPreview
                            videoUrl={item.videoUrl}
                            posterUrl={item.imageUrl || ""}
                            title={item.title}
                          />
                        ) : (
                          <ImageWithFallback
                            src={item.imageUrl || ""}
                            alt={item.alt}
                            title={item.title}
                            tone={tones[(photoIndexMap.get(item.id) ?? 0) % tones.length]}
                            load={true}
                            priority={(photoIndexMap.get(item.id) ?? 0) < 6 || item.id === "gallery-daily-01"}
                            sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
                          />
                        )}
                        {isVideo && (
                          <span className="gallery-play-overlay" aria-hidden="true">
                            <Play size={32} />
                          </span>
                        )}
                        <div className="gallery-masonry-overlay">
                          <span className="gallery-masonry-overlay-style">{t(`gallery.filters.${item.style}`, item.style)}</span>
                          <strong className="gallery-masonry-overlay-title">
                            <HighlightText text={item.title} query={searchQuery} />
                          </strong>
                          <span className="gallery-masonry-overlay-location">
                            <HighlightText text={item.location} query={searchQuery} />
                          </span>
                          <ShareButton photo={item} />
                        </div>
                      </button>
                      <div className="gallery-masonry-caption">
                        <p>{t(`gallery.filters.${item.style}`, item.style)}</p>
                        <h3><HighlightText text={item.title} query={searchQuery} /></h3>
                        <span><HighlightText text={item.location} query={searchQuery} /></span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ));
        })()}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="gallery-loading-indicator">
            <Loader2 className="gallery-loading-spinner" size={24} />
            <span>{t("gallery.loading")}</span>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Suspense fallback={null}>
          <Lightbox
            photos={photos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        </Suspense>
      )}
    </Section>
  );
}
