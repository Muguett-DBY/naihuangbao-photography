import type { PhotoItem, PhotoStyle } from "../types/photo";

export function getPublicPhotos(photos: PhotoItem[]): PhotoItem[] {
  return photos.filter(
    (photo) => photo.clientAuthorized && photo.visibility === "public",
  );
}

export function getFeaturedPhotos(photos: PhotoItem[], limit = 6): PhotoItem[] {
  return getPublicPhotos(photos).filter((photo) => photo.featured).slice(0, limit);
}

export function getPhotosByStyle(photos: PhotoItem[], style: PhotoStyle | "all"): PhotoItem[] {
  const publicPhotos = getPublicPhotos(photos);
  if (style === "all") {
    return publicPhotos;
  }
  return publicPhotos.filter((photo) => photo.style === style);
}
