import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { defaultSiteContent, mergeSiteContent } from "../data/content";
import type { PartialSiteContent, SiteContent } from "../types/content";

const SiteContentContext = createContext<SiteContent>(defaultSiteContent);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [remoteContent, setRemoteContent] = useState<PartialSiteContent | null>(null);

  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function loadContent() {
      try {
        const response = await fetch("/api/content", { signal: abortController.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { content?: PartialSiteContent };
        if (!ignore && data.content) {
          setRemoteContent(data.content);
        }
      } catch {
        // Local Vite dev has no Pages Functions; static content remains visible.
      }
    }

    const cancelIdleLoad = scheduleIdleTask(() => void loadContent());
    return () => {
      ignore = true;
      abortController.abort();
      cancelIdleLoad();
    };
  }, []);

  const content = useMemo(() => mergeSiteContent(remoteContent), [remoteContent]);

  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  return useContext(SiteContentContext);
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
