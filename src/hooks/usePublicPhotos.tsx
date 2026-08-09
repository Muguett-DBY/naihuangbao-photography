import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { galleryItems } from "../data/gallery";
import { resolvePublicPhotoSource } from "../lib/gallery-source";
import { scheduleIdleTask } from "../lib/idle";
import { isAbortError } from "../lib/errors";
import type { PhotoItem } from "../types/photo";

type PublicPhotosState = {
  photos: PhotoItem[];
  remoteLoaded: boolean;
};

const PublicPhotosContext = createContext<PublicPhotosState>({
  photos: galleryItems,
  remoteLoaded: false,
});

const localizedGalleryIds = new Set(galleryItems.map((photo) => photo.id));

export function PublicPhotosProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [remotePhotos, setRemotePhotos] = useState<PhotoItem[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function loadRemotePhotos() {
      try {
        const response = await fetch("/api/photos", { signal: abortController.signal });
        if (!response.ok) return;
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;
        const data = (await response.json()) as { photos?: PhotoItem[] };
        if (!ignore && Array.isArray(data.photos)) {
          setRemotePhotos(data.photos);
          setRemoteLoaded(true);
        }
      } catch (err) {
        if (!isAbortError(err)) console.warn("Public photos fetch failed", err);
      }
    }

    const cancelIdleLoad = scheduleIdleTask(() => void loadRemotePhotos(), 200);
    return () => {
      ignore = true;
      abortController.abort();
      cancelIdleLoad();
    };
  }, []);

  const photos = useMemo(() => (
    resolvePublicPhotoSource(galleryItems, remotePhotos, remoteLoaded).map((photo) => {
      if (!localizedGalleryIds.has(photo.id)) return photo;
      const key = `gallery.items.${photo.id}`;
      return {
        ...photo,
        title: t(`${key}.title` as never),
        location: t(`${key}.location` as never),
        alt: t(`${key}.alt` as never),
        album: t(`${key}.album` as never),
      };
    })
  ), [remoteLoaded, remotePhotos, t]);

  const value = useMemo(() => ({ photos, remoteLoaded }), [photos, remoteLoaded]);
  return (
    <PublicPhotosContext.Provider value={value}>
      {children}
    </PublicPhotosContext.Provider>
  );
}

export function usePublicPhotos() {
  return useContext(PublicPhotosContext);
}
