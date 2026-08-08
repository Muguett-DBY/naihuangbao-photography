import type { PhotoItem } from "../types/photo";

export type ExhibitionSeason = "spring" | "summer" | "autumn" | "winter" | "archive";

export type ExhibitionStop = {
  id: string;
  location: string;
  season: ExhibitionSeason;
  photos: PhotoItem[];
};

export function getExhibitionSeason(date?: string): ExhibitionSeason {
  if (!date) return "archive";
  const month = new Date(date).getMonth() + 1;
  if (!Number.isFinite(month)) return "archive";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function buildExhibitionStops(photos: readonly PhotoItem[]): ExhibitionStop[] {
  const groups = new Map<string, ExhibitionStop>();
  for (const photo of photos) {
    const location = photo.location || "Nanjing";
    const season = getExhibitionSeason(photo.createdAt);
    const id = `${location}::${season}`;
    const existing = groups.get(id);
    if (existing) existing.photos.push(photo);
    else groups.set(id, { id, location, season, photos: [photo] });
  }
  return Array.from(groups.values());
}
