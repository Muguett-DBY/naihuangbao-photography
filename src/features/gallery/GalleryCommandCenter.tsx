import type { RefObject } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GalleryViewToggle } from "../../components/GalleryViewToggle";
import type { SavedSearch } from "../../hooks/useSavedSearches";
import type { DateRange, FacetCounts } from "../../lib/gallery";
import type { PhotoItem } from "../../types/photo";
import {
  galleryThumb,
  STYLE_FILTERS,
  type SortMode,
  type StyleFilter,
  type ViewMode,
} from "./gallery-discovery";

type GalleryCommandCenterProps = {
  photos: PhotoItem[];
  sourceCount: number;
  filter: StyleFilter;
  albumFilter: string;
  dateRange: DateRange;
  searchQuery: string;
  debouncedSearch: string;
  viewMode: ViewMode;
  sortMode: SortMode;
  filterLabel: string;
  albumLabel: string;
  dateRangeLabel: string;
  viewLabel: string;
  sortLabel: string;
  filterCounts: Record<StyleFilter, number>;
  facetCounts: FacetCounts;
  albums: string[];
  hasActiveDiscovery: boolean;
  canSaveSearch: boolean;
  showRestored: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  savedSearches: SavedSearch[];
  onSearchChange: (value: string) => void;
  onSearchCommit: (value: string) => void;
  onFilterChange: (value: StyleFilter) => void;
  onAlbumChange: (value: string) => void;
  onDateRangeChange: (value: DateRange) => void;
  onViewChange: (value: ViewMode) => void;
  onSortChange: (value: SortMode) => void;
  onReset: () => void;
  onDismissRestored: () => void;
  onSaveSearch: () => void;
  onRestoreSearch: (search: SavedSearch) => void;
  onRemoveSearch: (id: string) => void;
};

export function GalleryCommandCenter(props: GalleryCommandCenterProps) {
  const { t } = useTranslation();
  const clearSearch = () => {
    props.onSearchChange("");
    props.onSearchCommit("");
    props.searchInputRef.current?.focus();
  };

  return (
    <div className="gallery-command-center" aria-label={t("gallery.discoveryTitle")}>
      <div className="gallery-command-header">
        <div className="gallery-command-copy">
          <span className="gallery-command-kicker">{t("gallery.discoveryKicker")}</span>
          <h3>{t("gallery.discoveryTitle")}</h3>
        </div>
        <div className="gallery-command-meta" role="status" aria-live="polite">
          <strong>{props.photos.length}</strong>
          <span>{t("gallery.resultSummary", {
            count: props.photos.length,
            total: props.sourceCount,
            filter: props.filterLabel,
            defaultValue: `${props.photos.length} of ${props.sourceCount} photos · ${props.filterLabel}`,
          })}</span>
        </div>
      </div>

      <div className="gallery-search-row">
        <div className="gallery-search-wrap">
          <Search size={16} className="gallery-search-icon" />
          <input
            ref={props.searchInputRef}
            type="search"
            className="gallery-search-input"
            placeholder={t("gallery.searchPlaceholder", "Search by title, location, style...")}
            value={props.searchQuery}
            onChange={(event) => props.onSearchChange(event.target.value)}
            aria-label={t("gallery.searchPlaceholder", "Search photos")}
          />
          {props.searchQuery ? (
            <button type="button" className="gallery-search-clear" onClick={clearSearch} aria-label={t("gallery.clearSearch", "Clear search")}>
              <X size={14} />
            </button>
          ) : <kbd className="gallery-search-shortcut" aria-hidden="true">/</kbd>}
        </div>
        <GalleryViewToggle value={props.viewMode} onChange={props.onViewChange} />
        <label className="gallery-sort-toggle">
          <span className="sr-only">{t("gallery.sortLabel", "Sort photos")}</span>
          <select value={props.sortMode} onChange={(event) => props.onSortChange(event.target.value as SortMode)}>
            <option value="default">{t("gallery.sortDefault", "Default order")}</option>
            <option value="newest">{t("gallery.sortNewest", "Newest first")}</option>
            <option value="featured">{t("gallery.sortFeatured", "Featured first")}</option>
          </select>
        </label>
      </div>

      {props.showRestored && props.hasActiveDiscovery && (
        <div className="gallery-restored-banner" role="status">
          <RotateCcw size={14} />
          <span>{t("gallery.restoredSession", "Restored from your last visit")}</span>
          <button type="button" onClick={props.onDismissRestored} aria-label={t("gallery.dismiss", "Dismiss")}><X size={12} /></button>
        </div>
      )}

      {props.hasActiveDiscovery ? (
        <div className="gallery-active-chips" aria-label={t("gallery.activeState", "Active gallery state")}>
          {props.filter !== "all" && <span>{t("gallery.activeFilter", { filter: props.filterLabel, defaultValue: `Style: ${props.filterLabel}` })}</span>}
          {props.albumFilter !== "all" && <span>{t("gallery.activeAlbum", { album: props.albumLabel, defaultValue: `Album: ${props.albumLabel}` })}</span>}
          {props.dateRange !== "all" && <span>{t("gallery.activeDate", { range: props.dateRangeLabel, defaultValue: `Date: ${props.dateRangeLabel}` })}</span>}
          {props.debouncedSearch && <span>{t("gallery.activeSearch", { query: props.debouncedSearch, defaultValue: `Search: ${props.debouncedSearch}` })}</span>}
          {props.viewMode !== "masonry" && <span>{t("gallery.activeView", { view: props.viewLabel, defaultValue: `View: ${props.viewLabel}` })}</span>}
          {props.sortMode !== "default" && <span>{t("gallery.sortLabel", "Sort photos")}: {props.sortLabel}</span>}
          <button type="button" onClick={props.onReset}>{t("gallery.clearDiscovery")}</button>
          {props.canSaveSearch && <button type="button" className="gallery-save-search" onClick={props.onSaveSearch} aria-label={t("gallery.saveSearch", "Save this search")}>{t("gallery.saveSearch", "Save search")}</button>}
        </div>
      ) : <p className="gallery-active-hint">{t("gallery.discoveryHint")}</p>}

      {props.savedSearches.length > 0 && (
        <div className="gallery-saved-searches" aria-label={t("gallery.savedSearches", "Saved searches")}>
          <span className="gallery-saved-searches-label">{t("gallery.savedSearches", "Saved searches")}:</span>
          {props.savedSearches.map((item) => (
            <span key={item.id} className="gallery-saved-search-pill">
              <button type="button" onClick={() => props.onRestoreSearch(item)}>{item.label}</button>
              <button type="button" className="gallery-saved-search-remove" onClick={() => props.onRemoveSearch(item.id)} aria-label={t("gallery.removeSavedSearch", "Remove saved search")}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="gallery-filter-scroll">
        <div className="filter-row" role="group" aria-label={t("gallery.intro")}>
          {STYLE_FILTERS.map((item) => {
            const unavailable = item !== "all" && props.filterCounts[item] === 0;
            return (
              <button key={item} type="button" aria-pressed={item === props.filter} aria-disabled={unavailable} className={item === props.filter ? "is-active" : ""} disabled={unavailable} onClick={() => props.onFilterChange(item)}>
                {t(`gallery.filters.${item}`)}<span className="filter-count">{props.filterCounts[item]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(props.albums.length > 0 || Object.values(props.facetCounts.dateRange).some((count) => count > 0)) && (
        <div className="gallery-facet-row" role="group" aria-label={t("gallery.facetsLabel", "Additional filters")}>
          {props.albums.length > 0 && (
            <label className="gallery-facet-select">
              <span>{t("gallery.albumLabel", "Album")}</span>
              <select value={props.albumFilter} onChange={(event) => props.onAlbumChange(event.target.value)}>
                <option value="all">{t("gallery.albumAll", "All albums")}</option>
                {props.albums.map((album) => <option key={album} value={album}>{album} ({props.facetCounts.album[album] ?? 0})</option>)}
              </select>
            </label>
          )}
          <label className="gallery-facet-select">
            <span>{t("gallery.dateRangeLabel", "Date range")}</span>
            <select value={props.dateRange} onChange={(event) => props.onDateRangeChange(event.target.value as DateRange)}>
              <option value="all">{t("gallery.dateRangeAll", "Any time")}</option>
              <option value="last-30">{t("gallery.dateRanges.last-30", "Last 30 days")} ({props.facetCounts.dateRange["last-30"]})</option>
              <option value="last-90">{t("gallery.dateRanges.last-90", "Last 90 days")} ({props.facetCounts.dateRange["last-90"]})</option>
              <option value="last-365">{t("gallery.dateRanges.last-365", "Last year")} ({props.facetCounts.dateRange["last-365"]})</option>
              <option value="older">{t("gallery.dateRanges.older", "Over a year ago")} ({props.facetCounts.dateRange.older})</option>
            </select>
          </label>
        </div>
      )}

      {props.photos.length > 0 && <div className="gallery-result-summary" key={`${props.filter}-${props.debouncedSearch}-${props.photos.length}`}><span className="gallery-result-count">{t("gallery.showing", { count: props.photos.length, total: props.sourceCount, defaultValue: `Showing ${props.photos.length} of ${props.sourceCount} photos` })}</span></div>}
      {props.photos.length > 0 && (
        <div className="gallery-filmstrip-wrap" aria-hidden="true">
          <div className="gallery-auto-scroll" data-scroll-speed="0.25">
            {props.photos.slice(0, 6).map((photo) => <div className="gallery-filmstrip-item" key={photo.id}><img src={galleryThumb(photo.imageUrl || "")} alt="" loading="lazy" fetchPriority="low" width={120} height={90} /></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
