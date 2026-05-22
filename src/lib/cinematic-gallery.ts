import type { PhotoItem } from "../types/photo";

export const MAX_CINEMATIC_PHOTOS = 24;

export function selectCinematicPhotos(
  photos: PhotoItem[],
  maxPhotos = MAX_CINEMATIC_PHOTOS,
): PhotoItem[] {
  return photos
    .map((photo, sourceIndex) => ({ photo, sourceIndex }))
    .filter(({ photo }) => (
      photo.clientAuthorized &&
      photo.visibility === "public" &&
      Boolean(photo.imageUrl)
    ))
    .sort((a, b) => {
      if (a.photo.featured !== b.photo.featured) {
        return a.photo.featured ? -1 : 1;
      }
      return a.sourceIndex - b.sourceIndex;
    })
    .slice(0, maxPhotos)
    .map(({ photo }) => photo);
}
