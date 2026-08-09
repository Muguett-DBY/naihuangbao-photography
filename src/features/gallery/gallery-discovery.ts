import type { GalleryViewMode } from "../../components/GalleryViewToggle";
import type { DateRange } from "../../lib/gallery";
import type { PhotoStyle } from "../../types/photo";

export type StyleFilter = PhotoStyle | "all";
export type ViewMode = GalleryViewMode;
export type SortMode = "default" | "newest" | "featured";

export interface GalleryPersistedState {
  filter: StyleFilter;
  album: string;
  dateRange: DateRange;
  search: string;
  view: ViewMode;
  sort: SortMode;
}

export const STYLE_FILTERS: StyleFilter[] = ["all", "jiangnan", "street", "park", "sweet", "couple", "indoor"];
export const GALLERY_TONES = ["rose", "sage", "cream", "ink"] as const;
export const GALLERY_PAGE_SIZE = 12;
const VIEW_MODES: ViewMode[] = ["masonry", "compact", "contact", "story", "atlas"];
const SORT_MODES: SortMode[] = ["default", "newest", "featured"];
const GALLERY_STATE_KEY = "nhb-gallery-discovery-state";

export function galleryThumb(src: string) {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
}

function isStyleFilter(value: string | null): value is StyleFilter {
  return Boolean(value && STYLE_FILTERS.includes(value as StyleFilter));
}

function isViewMode(value: string | null): value is ViewMode {
  return Boolean(value && VIEW_MODES.includes(value as ViewMode));
}

function isDateRange(value: string | null): value is DateRange {
  return Boolean(value && ["all", "last-30", "last-90", "last-365", "older"].includes(value));
}

function isSortMode(value: string | null): value is SortMode {
  return Boolean(value && SORT_MODES.includes(value as SortMode));
}

function loadPersistedState(): GalleryPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GALLERY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GalleryPersistedState>;
    return {
      filter: isStyleFilter(parsed.filter ?? null) ? (parsed.filter as StyleFilter) : "all",
      album: typeof parsed.album === "string" && parsed.album ? parsed.album : "all",
      dateRange: isDateRange(parsed.dateRange ?? null) ? (parsed.dateRange as DateRange) : "all",
      search: typeof parsed.search === "string" ? parsed.search : "",
      view: isViewMode(parsed.view ?? null) ? (parsed.view as ViewMode) : "masonry",
      sort: isSortMode(parsed.sort ?? null) ? (parsed.sort as SortMode) : "default",
    };
  } catch {
    return null;
  }
}

export function persistGalleryState(state: GalleryPersistedState) {
  try {
    window.localStorage.setItem(GALLERY_STATE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is a convenience; discovery remains usable if storage is full.
  }
}

export function clearPersistedGalleryState() {
  try {
    window.localStorage.removeItem(GALLERY_STATE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

export function getInitialGalleryState(searchParams: URLSearchParams): GalleryPersistedState & { restored: boolean } {
  const urlFilter = searchParams.get("style");
  const urlAlbum = searchParams.get("album");
  const urlDate = searchParams.get("date");
  const urlSearch = searchParams.get("q") || "";
  const urlView = searchParams.get("view");
  const urlSort = searchParams.get("sort");

  if (isStyleFilter(urlFilter) || urlAlbum || isDateRange(urlDate) || urlSearch || isViewMode(urlView) || isSortMode(urlSort)) {
    return {
      filter: isStyleFilter(urlFilter) ? urlFilter : "all",
      album: urlAlbum || "all",
      dateRange: isDateRange(urlDate) ? urlDate : "all",
      search: urlSearch,
      view: isViewMode(urlView) ? urlView : "masonry",
      sort: isSortMode(urlSort) ? urlSort : "default",
      restored: false,
    };
  }

  const persisted = loadPersistedState();
  if (persisted && (persisted.filter !== "all" || persisted.album !== "all" || persisted.dateRange !== "all" || persisted.search || persisted.view !== "masonry" || persisted.sort !== "default")) {
    return { ...persisted, restored: true };
  }

  return { filter: "all", album: "all", dateRange: "all", search: "", view: "masonry", sort: "default", restored: false };
}
