import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Play, Share2, Loader2, Search, X, LayoutGrid, Columns, RotateCcw } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSiteContent } from "../hooks/useSiteContent";
import { getPhotosByStyle, searchPhotos } from "../lib/gallery";
import type { PhotoItem, PhotoStyle } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";
import { Section } from "./Section";
import { HighlightText } from "./shared/HighlightText";
import { useDistortionHover } from "../hooks/useDistortionHover";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { useSavedSearches } from "../hooks/useSavedSearches";
import { FavoriteButton } from "./FavoriteButton";
import { RecentlyViewedStrip } from "./RecentlyViewedStrip";

type StyleFilter = PhotoStyle | "all";
type ViewMode = "masonry" | "compact";

interface GalleryPersistedState {
  filter: StyleFilter;
  search: string;
  view: ViewMode;
}

const STYLE_FILTERS: StyleFilter[] = ["all", "jiangnan", "street", "park", "sweet", "couple", "indoor"];
const VIEW_MODES: ViewMode[] = ["masonry", "compact"];
const GALLERY_STATE_KEY = "nhb-gallery-discovery-state";
const tones = ["rose", "sage", "cream", "ink"] as const;
const PAGE_SIZE = 12;
const Lightbox = lazy(() => import("./Lightbox"));
const galleryThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

function isStyleFilter(value: string | null): value is StyleFilter {
  return Boolean(value && STYLE_FILTERS.includes(value as StyleFilter));
}

function isViewMode(value: string | null): value is ViewMode {
  return Boolean(value && VIEW_MODES.includes(value as ViewMode));
}

function loadPersistedState(): GalleryPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GALLERY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GalleryPersistedState>;
    return {
      filter: isStyleFilter(parsed.filter ?? null) ? (parsed.filter as StyleFilter) : "all",
      search: typeof parsed.search === "string" ? parsed.search : "",
      view: isViewMode(parsed.view ?? null) ? (parsed.view as ViewMode) : "masonry",
    };
  } catch {
    return null;
  }
}

function persistGalleryState(state: GalleryPersistedState) {
  try {
    window.localStorage.setItem(GALLERY_STATE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded — ignore */ }
}

function getInitialState(searchParams: URLSearchParams): { filter: StyleFilter; search: string; view: ViewMode; restored: boolean } {
  const urlFilter = searchParams.get("style");
  const urlSearch = searchParams.get("q") || "";
  const urlView = searchParams.get("view");

  // URL params take priority
  if (isStyleFilter(urlFilter) || urlSearch || isViewMode(urlView)) {
    return {
      filter: isStyleFilter(urlFilter) ? urlFilter : "all",
      search: urlSearch,
      view: isViewMode(urlView) ? urlView : "masonry",
      restored: false,
    };
  }

  // Fall back to persisted state
  const persisted = loadPersistedState();
  if (persisted && (persisted.filter !== "all" || persisted.search || persisted.view !== "masonry")) {
    return {
      filter: persisted.filter,
      search: persisted.search,
      view: persisted.view,
      restored: true,
    };
  }

  return { filter: "all", search: "", view: "masonry", restored: false };
}

function VideoPreview({ videoUrl, posterUrl, title }: { videoUrl: string; posterUrl: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);

  const playVideo = () => {
    setHovering(true);
    videoRef.current?.play().catch(() => {});
  };

  const pauseVideo = () => {
    setHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const toggleTouchPlay = () => {
    if (videoRef.current?.paused) {
      playVideo();
    } else {
      pauseVideo();
    }
  };

  return (
    <div
      className="gallery-video-wrap"
      onMouseEnter={playVideo}
      onMouseLeave={pauseVideo}
      onTouchStart={toggleTouchPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTouchPlay(); } }}
      aria-label={`Play video: ${title}`}
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
  const { photos: sourcePhotos, remoteLoaded } = usePublicPhotos();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialState = useMemo(() => getInitialState(searchParams), []);
  const [filter, setFilter] = useState<StyleFilter>(initialState.filter);
  const [searchQuery, setSearchQuery] = useState(initialState.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialState.search);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<ViewMode>(initialState.view);
  const [sortMode, setSortMode] = useState<"default" | "newest" | "featured">("default");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchedId, setTouchedId] = useState<string | null>(null);
  const [showRestored, setShowRestored] = useState(initialState.restored);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const masonryRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const searched = useMemo<PhotoItem[]>(() => searchPhotos(styleFiltered, debouncedSearch), [styleFiltered, debouncedSearch]);
  const photos = useMemo<PhotoItem[]>(() => {
    if (sortMode === "default") return searched;
    const copy = [...searched];
    if (sortMode === "newest") {
      copy.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
    } else if (sortMode === "featured") {
      copy.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return copy;
  }, [searched, sortMode]);
  const filterLabel = t(`gallery.filters.${filter}`, filter);
  const viewLabel = t(viewMode === "compact" ? "gallery.viewCompact" : "gallery.viewMasonry");
  const hasActiveDiscovery = filter !== "all" || Boolean(searchQuery.trim() || debouncedSearch.trim()) || viewMode !== "masonry";
  const isRemoteSyncing = !remoteLoaded && sourcePhotos.length === 0;

  const savedSearches = useSavedSearches();
  const currentSearchKey = `${filter}::${debouncedSearch}::${viewMode}`;
  const isCurrentSaved = savedSearches.entries.some((item) => item.id === currentSearchKey);
  const canSaveSearch = hasActiveDiscovery && !isCurrentSaved;

  // Debounce search input to avoid filtering on every keystroke
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Trigger transition animation when filter or search changes
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 400);
    return () => clearTimeout(timer);
  }, [filter, debouncedSearch]);

  // Reset visible count when filter or debounced search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, debouncedSearch, viewMode]);

  // Auto-dismiss restored banner after 5 seconds
  useEffect(() => {
    if (!showRestored) return;
    const timer = setTimeout(() => setShowRestored(false), 5000);
    return () => clearTimeout(timer);
  }, [showRestored]);

  // Sync filter, search, and non-default view state to URL params.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("style", filter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (viewMode !== "masonry") params.set("view", viewMode);
    setSearchParams(params, { replace: true });
  }, [filter, debouncedSearch, viewMode, setSearchParams]);

  // Persist all gallery discovery state to localStorage
  useEffect(() => {
    persistGalleryState({ filter, search: debouncedSearch, view: viewMode });
  }, [filter, debouncedSearch, viewMode]);

  const resetGalleryDiscovery = useCallback(() => {
    setFilter("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setViewMode("masonry");
    try { window.localStorage.removeItem(GALLERY_STATE_KEY); } catch { /* ignore */ }
    setShowRestored(false);
    searchInputRef.current?.focus();
  }, []);

  useKeyboardShortcut({
    key: "/",
    onMatch: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
  });

  useKeyboardShortcut({
    key: "Escape",
    enabled: Boolean(searchQuery),
    onMatch: () => {
      setSearchQuery("");
      setDebouncedSearch("");
    },
  });

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

  const handleTouchStart = useCallback((id: string) => {
    setTouchedId(id);
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

  // Auto-clear touched state after 2.5 seconds
  useEffect(() => {
    if (!touchedId) return;
    const timer = setTimeout(() => setTouchedId(null), 2500);
    return () => clearTimeout(timer);
  }, [touchedId]);

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

      <RecentlyViewedStrip />

      <div className="gallery-command-center" aria-label={t("gallery.discoveryTitle")}>
        <div className="gallery-command-header">
          <div className="gallery-command-copy">
            <span className="gallery-command-kicker">{t("gallery.discoveryKicker")}</span>
            <h3>{t("gallery.discoveryTitle")}</h3>
          </div>
          <div className="gallery-command-meta" role="status" aria-live="polite">
            <strong>{photos.length}</strong>
            <span>
              {t("gallery.resultSummary", {
                count: photos.length,
                total: sourcePhotos.length,
                filter: filterLabel,
                defaultValue: `${photos.length} of ${sourcePhotos.length} photos · ${filterLabel}`,
              })}
            </span>
          </div>
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
                onClick={() => { setSearchQuery(""); setDebouncedSearch(""); searchInputRef.current?.focus(); }}
                aria-label={t("gallery.clearSearch", "Clear search")}
              >
                <X size={14} />
              </button>
            )}
            {!searchQuery && (
              <kbd className="gallery-search-shortcut" aria-hidden="true">/</kbd>
            )}
          </div>
          <div className="gallery-view-toggle" aria-label={t("gallery.viewMode", "View mode")}>
            <button
              type="button"
              className={`gallery-view-btn ${viewMode === "masonry" ? "is-active" : ""}`}
              onClick={() => setViewMode("masonry")}
              aria-label={t("gallery.viewMasonry", "Masonry view")}
              aria-pressed={viewMode === "masonry"}
              title={t("gallery.viewMasonry", "Masonry view")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`gallery-view-btn ${viewMode === "compact" ? "is-active" : ""}`}
              onClick={() => setViewMode("compact")}
              aria-label={t("gallery.viewCompact", "Compact view")}
              aria-pressed={viewMode === "compact"}
              title={t("gallery.viewCompact", "Compact view")}
            >
              <Columns size={16} />
            </button>
          </div>
          <label className="gallery-sort-toggle">
            <span className="sr-only">{t("gallery.sortLabel", "Sort photos")}</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "default" | "newest" | "featured")}
            >
              <option value="default">{t("gallery.sortDefault", "Default order")}</option>
              <option value="newest">{t("gallery.sortNewest", "Newest first")}</option>
              <option value="featured">{t("gallery.sortFeatured", "Featured first")}</option>
            </select>
          </label>
        </div>

        {showRestored && hasActiveDiscovery && (
          <div className="gallery-restored-banner" role="status">
            <RotateCcw size={14} />
            <span>{t("gallery.restoredSession", "Restored from your last visit")}</span>
            <button type="button" onClick={() => setShowRestored(false)} aria-label={t("gallery.dismiss", "Dismiss")}>
              <X size={12} />
            </button>
          </div>
        )}

        {hasActiveDiscovery ? (
          <div className="gallery-active-chips" aria-label={t("gallery.activeState", "Active gallery state")}>
            {filter !== "all" && (
              <span>{t("gallery.activeFilter", { filter: filterLabel, defaultValue: `Style: ${filterLabel}` })}</span>
            )}
            {debouncedSearch && (
              <span>{t("gallery.activeSearch", { query: debouncedSearch, defaultValue: `Search: ${debouncedSearch}` })}</span>
            )}
            {viewMode !== "masonry" && (
              <span>{t("gallery.activeView", { view: viewLabel, defaultValue: `View: ${viewLabel}` })}</span>
            )}
            <button type="button" onClick={resetGalleryDiscovery}>
              {t("gallery.clearDiscovery")}
            </button>
            {canSaveSearch && (
              <button
                type="button"
                className="gallery-save-search"
                onClick={() => {
                  savedSearches.save({
                    filter,
                    search: debouncedSearch,
                    view: viewMode,
                    label: `${filterLabel}${debouncedSearch ? ` · ${debouncedSearch}` : ""}`,
                  });
                }}
                aria-label={t("gallery.saveSearch", "Save this search")}
              >
                {t("gallery.saveSearch", "Save search")}
              </button>
            )}
          </div>
        ) : (
          <p className="gallery-active-hint">{t("gallery.discoveryHint")}</p>
        )}

        {savedSearches.entries.length > 0 && (
          <div className="gallery-saved-searches" aria-label={t("gallery.savedSearches", "Saved searches")}>
            <span className="gallery-saved-searches-label">{t("gallery.savedSearches", "Saved searches")}:</span>
            {savedSearches.entries.map((item) => (
              <span key={item.id} className="gallery-saved-search-pill">
                <button
                  type="button"
                  onClick={() => {
                    setFilter(item.filter as StyleFilter);
                    setSearchQuery(item.search);
                    setDebouncedSearch(item.search);
                    setViewMode(item.view as ViewMode);
                  }}
                >
                  {item.label}
                </button>
                <button
                  type="button"
                  className="gallery-saved-search-remove"
                  onClick={() => savedSearches.remove(item.id)}
                  aria-label={t("gallery.removeSavedSearch", "Remove saved search")}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="gallery-filter-scroll">
          <div className="filter-row" role="group" aria-label={t("gallery.intro")}>
            {STYLE_FILTERS.map((item) => {
              const isUnavailable = item !== "all" && filterCounts[item] === 0;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={item === filter}
                  aria-disabled={isUnavailable}
                  className={item === filter ? "is-active" : ""}
                  disabled={isUnavailable}
                  onClick={() => {
                    setFilter(item);
                    // Smooth scroll to gallery grid if user is above it
                    if (masonryRef.current) {
                      const rect = masonryRef.current.getBoundingClientRect();
                      if (rect.top > window.innerHeight) {
                        masonryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }
                  }}
                >
                  {t(`gallery.filters.${item}`)}
                  <span className="filter-count">{filterCounts[item]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="gallery-result-summary" key={`${filter}-${debouncedSearch}-${photos.length}`}>
            <span className="gallery-result-count">
              {t("gallery.showing", { count: photos.length, total: sourcePhotos.length, defaultValue: `Showing ${photos.length} of ${sourcePhotos.length} photos` })}
            </span>
          </div>
        )}

        {photos.length > 0 && (
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
        )}
      </div>

      <div ref={masonryRef}>
        {photos.length === 0 && (
          <div className="gallery-empty-state" role="status" aria-live="polite">
            <span>{isRemoteSyncing ? t("gallery.loading") : t("gallery.noResults")}</span>
            <h3>{t("gallery.emptyTitle")}</h3>
            <p>{t("gallery.emptyDesc")}</p>
            {hasActiveDiscovery && (
              <div className="gallery-empty-suggestions">
                <span className="gallery-empty-suggestions-label">{t("gallery.tryFilters", "Try these styles:")}</span>
                <div className="gallery-empty-suggestions-row">
                  {STYLE_FILTERS.filter((s) => s !== "all" && filterCounts[s] > 0).slice(0, 4).map((style) => (
                    <button
                      key={style}
                      type="button"
                      className="gallery-empty-suggestion-btn"
                      onClick={() => { setFilter(style); setSearchQuery(""); setDebouncedSearch(""); }}
                    >
                      {t(`gallery.filters.${style}`)}
                      <span className="gallery-empty-suggestion-count">{filterCounts[style]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={resetGalleryDiscovery}>
              {t("gallery.emptyReset")}
            </button>
          </div>
        )}

        {/* Album groupings */}
        {photos.length > 0 && (() => {
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
              <div className={`gallery-masonry ${viewMode === "compact" ? "gallery-masonry--compact" : ""} ${isTransitioning ? "gallery-masonry--transitioning" : ""}`}>
                {albumPhotos.map((item, index) => {
                  const isVideo = Boolean(item.videoUrl);
                  return (
                    <article
                      className={`gallery-masonry-item ${isVideo ? "is-video" : ""}${touchedId === item.id ? " is-touched" : ""}`}
                      data-gallery-photo-id={item.id}
                      key={item.id}
                      style={{ transitionDelay: `${index * 0.06}s` }}
                    >
                      <button
                        className="gallery-masonry-btn"
                        type="button"
                        data-distort
                        onClick={() => setLightboxIndex(photoIndexMap.get(item.id) ?? 0)}
                        onTouchStart={() => handleTouchStart(item.id)}
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
                        {item.featured && (
                          <span className="gallery-featured-badge" aria-label="Featured">
                            ⭐
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
                          <div className="gallery-masonry-overlay-actions">
                            <Link to={`/gallery/${item.id}`} className="gallery-detail-link" onClick={(e) => e.stopPropagation()}>
                              {t("gallery.viewDetails", "Details")} →
                            </Link>
                            <span onClick={(e) => e.stopPropagation()} role="presentation">
                              <FavoriteButton
                                variant="icon"
                                entry={{
                                  id: item.id,
                                  title: item.title,
                                  href: `/gallery/${item.id}`,
                                  imageUrl: item.imageUrl,
                                }}
                              />
                            </span>
                            <ShareButton photo={item} />
                          </div>
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
        {!hasMore && photos.length > 0 && (
          <div className="gallery-end-indicator">
            <span>{t("gallery.allLoaded", "All photos loaded")}</span>
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
