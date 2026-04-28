import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { defaultSiteContent, mergeSiteContent } from "../data/content";
import type { PartialSiteContent, SiteContent } from "../types/content";

const SiteContentContext = createContext<SiteContent>(defaultSiteContent);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [remoteContent, setRemoteContent] = useState<PartialSiteContent | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadContent() {
      try {
        const response = await fetch("/api/content");
        if (!response.ok) return;
        const data = (await response.json()) as { content?: PartialSiteContent };
        if (!ignore && data.content) {
          setRemoteContent(data.content);
        }
      } catch {
        // Local Vite dev has no Pages Functions; static content remains visible.
      }
    }

    void loadContent();
    return () => {
      ignore = true;
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
