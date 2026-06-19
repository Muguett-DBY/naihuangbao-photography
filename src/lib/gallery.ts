import type { PhotoItem, PhotoStyle } from "../types/photo";

export function getPublicPhotos(photos: PhotoItem[]): PhotoItem[] {
  return photos.filter(
    (photo) => photo.clientAuthorized && photo.visibility === "public",
  );
}

export function getPhotosByStyle(photos: PhotoItem[], style: PhotoStyle | "all"): PhotoItem[] {
  const publicPhotos = getPublicPhotos(photos);
  if (style === "all") {
    return publicPhotos;
  }
  return publicPhotos.filter((photo) => photo.style === style);
}

export function searchPhotos(photos: PhotoItem[], query: string): PhotoItem[] {
  if (!query.trim()) return photos;
  const q = query.trim().toLowerCase();
  return photos.filter(
    (photo) =>
      photo.title.toLowerCase().includes(q) ||
      photo.location.toLowerCase().includes(q) ||
      photo.style.toLowerCase().includes(q) ||
      (photo.album && photo.album.toLowerCase().includes(q)),
  );
}

export function getAlbums(photos: PhotoItem[]): string[] {
  const set = new Set<string>();
  for (const photo of photos) {
    if (photo.album) set.add(photo.album);
  }
  return Array.from(set).sort();
}

export type DateRange = "all" | "last-30" | "last-90" | "last-365" | "older";

export function filterByDateRange(photos: PhotoItem[], range: DateRange): PhotoItem[] {
  if (range === "all") return photos;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const cutoff: number = (() => {
    if (range === "last-30") return now - 30 * dayMs;
    if (range === "last-90") return now - 90 * dayMs;
    if (range === "last-365") return now - 365 * dayMs;
    return 0;
  })();
  return photos.filter((photo) => {
    if (!photo.createdAt) return range === "older";
    const t = Date.parse(photo.createdAt);
    if (Number.isNaN(t)) return false;
    if (range === "older") return t < now - 365 * dayMs;
    return t >= cutoff;
  });
}

export type FacetFilters = {
  style: PhotoStyle | "all";
  album: string | "all";
  dateRange: DateRange;
  search: string;
};

export const DEFAULT_FACETS: FacetFilters = {
  style: "all",
  album: "all",
  dateRange: "all",
  search: "",
};

/**
 * Multi-dimensional faceted filter: applies style, album, date range, and free-text
 * search in sequence. The order is intentional — cheap categorical filters first,
 * then substring search.
 */
export function facetedSearch(photos: PhotoItem[], filters: FacetFilters): PhotoItem[] {
  let result = getPhotosByStyle(photos, filters.style);
  if (filters.album !== "all") {
    result = result.filter((photo) => photo.album === filters.album);
  }
  if (filters.dateRange !== "all") {
    result = filterByDateRange(result, filters.dateRange);
  }
  if (filters.search.trim()) {
    result = searchPhotos(result, filters.search);
  }
  return result;
}

export type FacetCounts = {
  style: Record<PhotoStyle | "all", number>;
  album: Record<string, number>;
  dateRange: Record<DateRange, number>;
};

export function countFacets(photos: PhotoItem[]): FacetCounts {
  const publicPhotos = getPublicPhotos(photos);
  const styleCounts = { all: publicPhotos.length } as Record<PhotoStyle | "all", number>;
  const albumCounts: Record<string, number> = { all: publicPhotos.length };
  const dateRangeCounts: Record<DateRange, number> = { all: publicPhotos.length, "last-30": 0, "last-90": 0, "last-365": 0, older: 0 };
  for (const photo of publicPhotos) {
    styleCounts[photo.style] = (styleCounts[photo.style] ?? 0) + 1;
    if (photo.album) albumCounts[photo.album] = (albumCounts[photo.album] ?? 0) + 1;
    if (!photo.createdAt) continue;
    const t = Date.parse(photo.createdAt);
    if (Number.isNaN(t)) continue;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (t >= now - 30 * dayMs) dateRangeCounts["last-30"]++;
    if (t >= now - 90 * dayMs) dateRangeCounts["last-90"]++;
    if (t >= now - 365 * dayMs) dateRangeCounts["last-365"]++;
    else dateRangeCounts.older++;
  }
  return { style: styleCounts, album: albumCounts, dateRange: dateRangeCounts };
}
