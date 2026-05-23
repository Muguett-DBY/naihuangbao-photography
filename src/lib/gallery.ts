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
