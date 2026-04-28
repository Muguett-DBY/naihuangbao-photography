import type { PhotoItem } from "../types/photo";

export function resolvePublicPhotoSource(
  staticPhotos: PhotoItem[],
  remotePhotos: PhotoItem[],
  remoteLoaded: boolean,
): PhotoItem[] {
  return remoteLoaded ? remotePhotos : staticPhotos;
}
