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
