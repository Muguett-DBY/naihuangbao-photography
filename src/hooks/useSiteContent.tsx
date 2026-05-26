import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { defaultSiteContent as zhCN } from "../data/contents/zh-CN";
import { defaultSiteContent as en } from "../data/contents/en";
import { defaultSiteContent as ko } from "../data/contents/ko";
import { defaultSiteContent as ja } from "../data/contents/ja";
import { mergeSiteContent } from "../data/content";
import { scheduleIdleTask } from "../lib/idle";
import { isAbortError } from "../lib/errors";
import type { PartialSiteContent, SiteContent } from "../types/content";

const defaultsMap: Record<string, SiteContent> = {
  "zh-CN": zhCN,
  en: en,
  ko: ko,
  ja: ja,
};

const SiteContentContext = createContext<SiteContent>(zhCN);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
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

  const defaults = useMemo(() => defaultsMap[i18n.language] || zhCN, [i18n.language]);
  const content = useMemo(() => mergeSiteContent(remoteContent, defaults), [remoteContent, defaults]);

  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
