import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { defaultSiteContent, mergeSiteContent } from "../data/content";
import { scheduleIdleTask } from "../lib/idle";
import { isAbortError } from "../lib/errors";
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
      } catch (err) {
        if (!isAbortError(err)) console.warn("Site content fetch failed", err);
      }
    }

    const cancelIdleLoad = scheduleIdleTask(() => void loadContent(), 1200);
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
