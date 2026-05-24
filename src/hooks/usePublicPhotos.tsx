import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { galleryItems } from "../data/gallery";
import { resolvePublicPhotoSource } from "../lib/gallery-source";
import { scheduleIdleTask } from "../lib/idle";
import type { PhotoItem } from "../types/photo";

type PublicPhotosState = {
  photos: PhotoItem[];
  remoteLoaded: boolean;
};

const PublicPhotosContext = createContext<PublicPhotosState>({
  photos: galleryItems,
  remoteLoaded: false,
});

export function PublicPhotosProvider({ children }: { children: ReactNode }) {
  const [remotePhotos, setRemotePhotos] = useState<PhotoItem[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function loadRemotePhotos() {
      try {
        const response = await fetch("/api/photos", { signal: abortController.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { photos?: PhotoItem[] };
        if (!ignore && Array.isArray(data.photos)) {
          setRemotePhotos(data.photos);
          setRemoteLoaded(true);
        }
      } catch {
        // Local Vite dev has no Pages Functions; static placeholders remain visible.
      }
    }

    const cancelIdleLoad = scheduleIdleTask(() => void loadRemotePhotos(), 200);
    return () => {
      ignore = true;
      abortController.abort();
      cancelIdleLoad();
    };
  }, []);

  const photos = useMemo(
    () => resolvePublicPhotoSource(galleryItems, remotePhotos, remoteLoaded),
    [remoteLoaded, remotePhotos],
  );

  return (
    <PublicPhotosContext.Provider value={{ photos, remoteLoaded }}>
      {children}
    </PublicPhotosContext.Provider>
  );
}

export function usePublicPhotos() {
  return useContext(PublicPhotosContext);
}
