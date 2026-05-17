import type { PhotoItem } from "../../types/photo";

export type PhotosTabProps = {
  photos: PhotoItem[];
};

export function PhotosTab({ photos }: PhotosTabProps) {
  return <>{photos.length}</>;
}
