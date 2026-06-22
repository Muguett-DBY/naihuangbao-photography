import type { PhotoItem } from "../types/photo";

/**
 * Calculate similarity score between two photos
 * Uses a hybrid scoring system based on style, album, location, and recency
 */
function calculateSimilarityScore(photo: PhotoItem, other: PhotoItem): number {
  let score = 0;
  
  // Style match: most important factor (0-30 points)
  if (photo.style === other.style) {
    score += 30;
  }
  
  // Album match: strong indicator of relevance (0-25 points)
  if (photo.album && other.album && photo.album === other.album) {
    score += 25;
  }
  
  // Location match: suggests similar setting (0-15 points)
  if (photo.location === other.location) {
    score += 15;
  }
  
  // Title similarity: basic keyword matching (0-10 points)
  const titleWords = new Set(photo.title.toLowerCase().split(/\s+/));
  const otherTitleWords = new Set(other.title.toLowerCase().split(/\s+/));
  const commonWords = [...titleWords].filter(w => otherTitleWords.has(w) && w.length > 2);
  score += Math.min(10, commonWords.length * 2);
  
  // Recency bonus: more recent photos get slight boost (0-10 points)
  if (photo.createdAt && other.createdAt) {
    const diff = Math.abs(new Date(photo.createdAt).getTime() - new Date(other.createdAt).getTime());
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) score += 10;
    else if (daysDiff < 90) score += 5;
  }
  
  // Featured bonus (0-5 points)
  if (other.featured && !photo.featured) {
    score += 5;
  }
  
  return score;
}

/**
 * Get related photos using a hybrid scoring algorithm
 * Combines style, album, location, title similarity, recency, and featured status
 */
export function getRelatedPhotos(
  currentPhoto: PhotoItem,
  allPhotos: PhotoItem[],
  limit = 6
): PhotoItem[] {
  if (!currentPhoto) return [];
  
  // Score all other photos
  const scoredPhotos = allPhotos
    .filter(p => p.id !== currentPhoto.id)
    .map(photo => ({
      photo,
      score: calculateSimilarityScore(currentPhoto, photo)
    }))
    .sort((a, b) => b.score - a.score);
  
  // Return top matches
  return scoredPhotos.slice(0, limit).map(s => s.photo);
}
