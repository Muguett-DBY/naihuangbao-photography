import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { galleryItems } from "../data/gallery";
import { resolvePublicPhotoSource } from "../lib/gallery-source";
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

    const cancelIdleLoad = scheduleIdleTask(() => void loadRemotePhotos());
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

function scheduleIdleTask(callback: () => void) {
  const browserWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  let idleHandle: number | null = null;

  const timeoutHandle = window.setTimeout(() => {
    if (browserWindow.requestIdleCallback) {
      idleHandle = browserWindow.requestIdleCallback(callback, { timeout: 2500 });
      return;
    }

    callback();
  }, 1200);

  return () => {
    window.clearTimeout(timeoutHandle);
    if (idleHandle !== null) {
      browserWindow.cancelIdleCallback?.(idleHandle);
    }
  };
}
