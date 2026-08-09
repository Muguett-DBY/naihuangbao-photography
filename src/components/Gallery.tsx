import "../styles/pages.css";
import "../styles/gallery.css";
import "../styles/gallery-exhibition.css";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { useSearchParams } from "react-router";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CompareBar } from "./CompareBar";
import { QuickView } from "./QuickView";
import { RecentlyViewedStrip } from "./RecentlyViewedStrip";
import { Section } from "./Section";
import { useExperienceStore } from "../experience/ExperienceProvider";
import { GalleryCommandCenter } from "../features/gallery/GalleryCommandCenter";
import { GalleryResults } from "../features/gallery/GalleryResults";
import {
  clearPersistedGalleryState,
  GALLERY_PAGE_SIZE,
  getInitialGalleryState,
  persistGalleryState,
  type SortMode,
  type StyleFilter,
  type ViewMode,
} from "../features/gallery/gallery-discovery";
import { useCompare } from "../hooks/useCompare";
import { useDistortionHover } from "../hooks/useDistortionHover";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSavedSearches, type SavedSearch } from "../hooks/useSavedSearches";
import { useSiteContent } from "../hooks/useSiteContent";
import { countFacets, facetedSearch, getAlbums, type DateRange, type FacetFilters } from "../lib/gallery";
import type { PhotoItem } from "../types/photo";
import { track } from "../utils/track";

const Lightbox = lazy(() => import("./Lightbox"));

type GalleryProps = {
  onImmersivePhotosChange?: (imageUrls: readonly string[]) => void;
};

export function Gallery({ onImmersivePhotosChange }: GalleryProps = {}) {
  const { t } = useTranslation();
  const { sectionCopy } = useSiteContent();
  const { photos: sourcePhotos, remoteLoaded } = usePublicPhotos();
  const experienceStore = useExperienceStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialState = useMemo(() => getInitialGalleryState(searchParams), []);
  const [filter, setFilter] = useState<StyleFilter>(initialState.filter);
  const [albumFilter, setAlbumFilter] = useState(initialState.album);
  const [dateRange, setDateRange] = useState<DateRange>(initialState.dateRange);
  const [searchQuery, setSearchQuery] = useState(initialState.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialState.search);
  const [viewMode, setViewMode] = useState<ViewMode>(initialState.view);
  const [sortMode, setSortMode] = useState<SortMode>(initialState.sort);
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [quickViewPhoto, setQuickViewPhoto] = useState<PhotoItem | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchedId, setTouchedId] = useState<string | null>(null);
  const [showRestored, setShowRestored] = useState(initialState.restored);
  const interactionIdsRef = useRef<{ hovered: string | null; focused: string | null }>({ hovered: null, focused: null });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const masonryRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchCleanupRef = useRef<(() => void) | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; t: number; id: string } | null>(null);
  const distortRef = useDistortionHover();
  const savedSearches = useSavedSearches();

  const resetHighlightedId = useCallback(() => {
    interactionIdsRef.current = { hovered: null, focused: null };
    experienceStore.setHighlightedId(null);
  }, [experienceStore]);

  const handleHighlight = useCallback((kind: "hovered" | "focused", id: string | null) => {
    interactionIdsRef.current[kind] = id;
    const { hovered, focused } = interactionIdsRef.current;
    experienceStore.setHighlightedId(hovered ?? focused);
  }, [experienceStore]);

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
      if (photo.style in counts) counts[photo.style as StyleFilter] += 1;
    }
    return counts;
  }, [sourcePhotos]);
  const albums = useMemo(() => getAlbums(sourcePhotos), [sourcePhotos]);
  const facetCounts = useMemo(() => countFacets(sourcePhotos), [sourcePhotos]);
  const facetedFilters = useMemo<FacetFilters>(() => ({
    style: filter,
    album: albumFilter,
    dateRange,
    search: debouncedSearch,
  }), [filter, albumFilter, dateRange, debouncedSearch]);
  const searched = useMemo(() => facetedSearch(sourcePhotos, facetedFilters), [sourcePhotos, facetedFilters]);
  const photos = useMemo(() => {
    if (sortMode === "default") return searched;
    const next = [...searched];
    if (sortMode === "newest") {
      next.sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0));
    } else if (sortMode === "featured") {
      next.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return next;
  }, [searched, sortMode]);
  const visiblePhotos = useMemo(() => photos.slice(0, visibleCount), [photos, visibleCount]);
  const photoIndexMap = useMemo(() => new Map(photos.map((photo, index) => [photo.id, index])), [photos]);
  const hasMore = visibleCount < photos.length;
  const filterLabel = t(`gallery.filters.${filter}`, filter);
  const albumLabel = albumFilter === "all" ? "" : albumFilter;
  const dateRangeLabel = dateRange === "all" ? "" : t(`gallery.dateRanges.${dateRange}`, dateRange);
  const viewLabel = t(viewMode === "compact" ? "gallery.viewCompact" : viewMode === "contact" ? "gallery.viewContact" : viewMode === "story" ? "gallery.viewStory" : viewMode === "atlas" ? "gallery.viewAtlas" : "gallery.viewMasonry");
  const sortLabel = t(`gallery.sort${sortMode.charAt(0).toUpperCase()}${sortMode.slice(1)}`, sortMode);
  const hasActiveDiscovery = filter !== "all" || Boolean(searchQuery.trim() || debouncedSearch.trim()) || viewMode !== "masonry" || albumFilter !== "all" || dateRange !== "all" || sortMode !== "default";
  const activeFilterCount = [filter !== "all", albumFilter !== "all", dateRange !== "all", Boolean(debouncedSearch.trim()), viewMode !== "masonry", sortMode !== "default"].filter(Boolean).length;
  const currentSearchKey = `${filter}::${albumFilter}::${dateRange}::${debouncedSearch}::${viewMode}::${sortMode}`;
  const canSaveSearch = hasActiveDiscovery && !savedSearches.entries.some((item) => item.id === currentSearchKey);
  const isRemoteSyncing = !remoteLoaded && sourcePhotos.length === 0;

  useEffect(() => {
    onImmersivePhotosChange?.(photos.slice(0, 6).map((photo) => photo.imageUrl));
    resetHighlightedId();
  }, [onImmersivePhotosChange, photos, resetHighlightedId]);

  useEffect(() => () => resetHighlightedId(), [resetHighlightedId]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 400);
    return () => clearTimeout(timer);
  }, [filter, albumFilter, dateRange, debouncedSearch, sortMode]);

  useEffect(() => setVisibleCount(GALLERY_PAGE_SIZE), [filter, albumFilter, dateRange, debouncedSearch, viewMode, sortMode]);

  useEffect(() => {
    if (!showRestored) return;
    const timer = setTimeout(() => setShowRestored(false), 5000);
    return () => clearTimeout(timer);
  }, [showRestored]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== "all") {
      params.set("style", filter);
      track("gallery_filter", { style: filter });
    }
    if (albumFilter !== "all") params.set("album", albumFilter);
    if (dateRange !== "all") params.set("date", dateRange);
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
      track("gallery_search", { query: debouncedSearch });
    }
    if (viewMode !== "masonry") params.set("view", viewMode);
    if (sortMode !== "default") params.set("sort", sortMode);
    setSearchParams(params, { replace: true });
  }, [filter, albumFilter, dateRange, debouncedSearch, viewMode, sortMode, setSearchParams]);

  useEffect(() => {
    persistGalleryState({ filter, album: albumFilter, dateRange, search: debouncedSearch, view: viewMode, sort: sortMode });
  }, [filter, albumFilter, dateRange, debouncedSearch, viewMode, sortMode]);

  const resetGalleryDiscovery = useCallback(() => {
    setFilter("all");
    setAlbumFilter("all");
    setDateRange("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setViewMode("masonry");
    setSortMode("default");
    clearPersistedGalleryState();
    setShowRestored(false);
    searchInputRef.current?.focus();
  }, []);

  useKeyboardShortcut({ key: "/", onMatch: () => { searchInputRef.current?.focus(); searchInputRef.current?.select(); } });
  useKeyboardShortcut({ key: "Escape", enabled: Boolean(searchQuery), onMatch: () => { setSearchQuery(""); setDebouncedSearch(""); } });
  const compare = useCompare();
  useKeyboardShortcut({
    key: "c",
    enabled: compare.count >= 2,
    onMatch: () => {
      track("compare_opened", { count: compare.count, source: "keyboard" });
      window.location.assign("/compare");
    },
  });

  useEffect(() => {
    const target = masonryRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      void import("./Lightbox");
      observer.disconnect();
    }, { rootMargin: "300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => count + GALLERY_PAGE_SIZE);
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const handleTouchStart = useCallback((id: string, event: TouchEvent) => {
    setTouchedId(id);
    touchCleanupRef.current?.();
    touchTimerRef.current = setTimeout(() => navigator.vibrate?.(12), 400);
    const touch = event.touches[0];
    if (touch) swipeStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), id };
    const clear = () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("touchmove", clear, true);
      swipeStartRef.current = null;
      touchCleanupRef.current = null;
    };
    const onTouchEnd = (nativeEvent: Event) => {
      const start = swipeStartRef.current;
      const changed = (nativeEvent as globalThis.TouchEvent).changedTouches?.[0];
      if (start && changed) {
        const dx = changed.clientX - start.x;
        const dy = changed.clientY - start.y;
        if (Date.now() - start.t < 600 && Math.abs(dy) >= 50 && Math.abs(dx) < 80) {
          const index = photoIndexMap.get(start.id);
          if (typeof index === "number") {
            setLightboxIndex(index);
            track("lightbox_open", { photoId: start.id, source: "swipe" });
            navigator.vibrate?.(8);
          }
        }
      }
      clear();
    };
    touchCleanupRef.current = clear;
    document.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    document.addEventListener("touchmove", clear, { passive: true, capture: true });
  }, [photoIndexMap]);

  useEffect(() => () => {
    touchCleanupRef.current?.();
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  useEffect(() => {
    if (!touchedId) return;
    const timer = setTimeout(() => setTouchedId(null), 2500);
    return () => clearTimeout(timer);
  }, [touchedId]);

  const handleFilterChange = (nextFilter: StyleFilter) => {
    setFilter(nextFilter);
    const target = masonryRef.current;
    if (target && target.getBoundingClientRect().top > window.innerHeight) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRestoreSearch = (item: SavedSearch) => {
    setFilter(item.filter as StyleFilter);
    setAlbumFilter(item.album || "all");
    setDateRange((item.dateRange || "all") as DateRange);
    setSearchQuery(item.search);
    setDebouncedSearch(item.search);
    setViewMode(item.view as ViewMode);
    setSortMode((item.sort || "default") as SortMode);
  };

  const handleSaveSearch = () => savedSearches.save({
    filter,
    album: albumFilter,
    dateRange,
    search: debouncedSearch,
    view: viewMode,
    sort: sortMode,
    label: [filterLabel, albumLabel, dateRangeLabel, debouncedSearch, viewMode !== "masonry" ? viewLabel : "", sortMode !== "default" ? sortLabel : ""].filter(Boolean).join(" · "),
  });

  const handleOpen = useCallback((photo: PhotoItem, source: "atlas" | "tap") => {
    setLightboxIndex(photoIndexMap.get(photo.id) ?? 0);
    track("lightbox_open", { photoId: photo.id, style: photo.style, source });
  }, [photoIndexMap]);

  return (
    <Section id="gallery" eyebrow={sectionCopy.gallery.eyebrow} title={sectionCopy.gallery.title} intro={sectionCopy.gallery.intro}>
      <div ref={distortRef} className="gallery-story-panel" aria-label={t("gallery.intro")}>
        <div><span>{t("gallery.eyebrow")}</span><strong>{t("gallery.intro")}</strong></div>
        <p>{t("gallery.description")}</p>
      </div>
      <RecentlyViewedStrip />
      <GalleryCommandCenter
        photos={photos}
        sourceCount={sourcePhotos.length}
        filter={filter}
        albumFilter={albumFilter}
        dateRange={dateRange}
        searchQuery={searchQuery}
        debouncedSearch={debouncedSearch}
        viewMode={viewMode}
        sortMode={sortMode}
        filterLabel={filterLabel}
        albumLabel={albumLabel}
        dateRangeLabel={dateRangeLabel}
        viewLabel={viewLabel}
        sortLabel={sortLabel}
        filterCounts={filterCounts}
        facetCounts={facetCounts}
        albums={albums}
        hasActiveDiscovery={hasActiveDiscovery}
        canSaveSearch={canSaveSearch}
        showRestored={showRestored}
        searchInputRef={searchInputRef}
        savedSearches={savedSearches.entries}
        onSearchChange={setSearchQuery}
        onSearchCommit={setDebouncedSearch}
        onFilterChange={handleFilterChange}
        onAlbumChange={setAlbumFilter}
        onDateRangeChange={setDateRange}
        onViewChange={setViewMode}
        onSortChange={setSortMode}
        onReset={resetGalleryDiscovery}
        onDismissRestored={() => setShowRestored(false)}
        onSaveSearch={handleSaveSearch}
        onRestoreSearch={handleRestoreSearch}
        onRemoveSearch={savedSearches.remove}
      />
      <GalleryResults
        photos={photos}
        visiblePhotos={visiblePhotos}
        viewMode={viewMode}
        searchQuery={searchQuery}
        isTransitioning={isTransitioning}
        isRemoteSyncing={isRemoteSyncing}
        touchedId={touchedId}
        hasActiveDiscovery={hasActiveDiscovery}
        hasMore={hasMore}
        filterCounts={filterCounts}
        photoIndexMap={photoIndexMap}
        masonryRef={masonryRef}
        sentinelRef={sentinelRef}
        onReset={resetGalleryDiscovery}
        onEmptySuggestion={(style) => { setFilter(style); setSearchQuery(""); setDebouncedSearch(""); }}
        onOpen={handleOpen}
        onQuickView={setQuickViewPhoto}
        onTouchStart={handleTouchStart}
        onHighlight={handleHighlight}
      />
      {lightboxIndex !== null && <Suspense fallback={null}><Lightbox photos={photos} currentIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} /></Suspense>}
      <QuickView photo={quickViewPhoto} onClose={() => setQuickViewPhoto(null)} />
      <CompareBar />
      {hasActiveDiscovery && (
        <button type="button" className="gallery-clear-filters-fab" onClick={resetGalleryDiscovery} aria-label={t("gallery.clearAllFilters", `Clear all ${activeFilterCount} active filters`)}>
          <X size={16} /><span>{t("gallery.clearAll", "Clear all")}</span><span className="gallery-clear-filters-count">{activeFilterCount}</span>
        </button>
      )}
    </Section>
  );
}
