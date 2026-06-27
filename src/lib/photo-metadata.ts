/**
 * Photo metadata extraction utilities.
 * Extracts metadata from filename patterns and image dimensions.
 */

export type PhotoMetadata = {
  filename: string;
  size: number | null;
  type: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: string;
  category: string;
  tags: string[];
  capturedAt: string | null;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  jiangnan: ["jiangnan", "江南", "jn", "water", "水乡"],
  street: ["street", "街道", "st", "urban", "city", "城市"],
  park: ["park", "公园", "garden", "园", "nature"],
  sweet: ["sweet", "甜美", "cute", "可爱", "少女"],
  couple: ["couple", "情侣", "love", "情侣写真", "wedding"],
  indoor: ["indoor", "室内", "studio", "影楼", "房间"],
};

function inferCategory(filename: string): string {
  const lower = filename.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return "uncategorized";
}

function inferTags(filename: string): string[] {
  const baseName = filename.replace(/\.[^.]+$/, "");
  const parts = baseName.split(/[-_.\s]+/);
  const tags: string[] = [];
  for (const part of parts) {
    if (part.length >= 2 && part.length <= 20 && !/^\d+$/.test(part)) {
      tags.push(part);
    }
    if (tags.length >= 5) break;
  }
  return Array.from(new Set(tags));
}

function inferCaptureDate(filename: string): string | null {
  const match = filename.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month}-${day}`;
  }
  return null;
}

function computeAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export function extractPhotoMetadata(file: File | { name: string; size?: number; type?: string }): PhotoMetadata {
  const filename = file.name;
  const size = "size" in file ? file.size ?? null : null;
  const type = "type" in file ? file.type ?? null : null;

  return {
    filename,
    size,
    type,
    width: null,
    height: null,
    aspectRatio: "unknown",
    category: inferCategory(filename),
    tags: inferTags(filename),
    capturedAt: inferCaptureDate(filename),
  };
}

export function updatePhotoMetadataWithDimensions(
  metadata: PhotoMetadata,
  width: number,
  height: number,
): PhotoMetadata {
  return {
    ...metadata,
    width,
    height,
    aspectRatio: computeAspectRatio(width, height),
  };
}

export function searchPhotosByTag<T extends { tags?: string[]; title?: string; location?: string; style?: string }>(
  photos: T[],
  query: string,
): T[] {
  if (!query.trim()) return photos;
  const lower = query.toLowerCase();
  return photos.filter((photo) => {
    if (photo.title?.toLowerCase().includes(lower)) return true;
    if (photo.location?.toLowerCase().includes(lower)) return true;
    if (photo.style?.toLowerCase().includes(lower)) return true;
    if (photo.tags?.some((tag) => tag.toLowerCase().includes(lower))) return true;
    return false;
  });
}
