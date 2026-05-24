import type { PhotoItem } from "../types/photo";

export function resolvePublicPhotoSource(
  staticPhotos: PhotoItem[],
  remotePhotos: PhotoItem[],
  remoteLoaded: boolean,
): PhotoItem[] {
  if (!remoteLoaded) return staticPhotos;
  if (!remotePhotos.length) return staticPhotos;

  const remoteById = new Map(remotePhotos.map((photo) => [photo.id, photo]));
  const staticIds = new Set(staticPhotos.map((photo) => photo.id));
  const orderedKnownPhotos = staticPhotos.map((photo) => remoteById.get(photo.id) ?? photo);
  const remoteOnlyPhotos = remotePhotos.filter((photo) => !staticIds.has(photo.id));

  return [...orderedKnownPhotos, ...remoteOnlyPhotos];
}
