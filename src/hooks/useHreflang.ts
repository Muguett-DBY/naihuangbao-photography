import { useEffect } from "react";
import { siteOrigin } from "../lib/site-origin";

const SUPPORTED_LANGS = ["zh-CN", "en", "ja", "ko"] as const;

type HreflangOptions = {
  path: string;
  enabled?: boolean;
};

function setHreflangLink(hreflang: string, href: string) {
  const selector = `link[rel="alternate"][hreflang="${hreflang}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.rel = "alternate";
    el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.href = href;
}

function removeAllHreflang() {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
}

export function useHreflang({ path, enabled = true }: HreflangOptions) {
  useEffect(() => {
    if (!enabled) {
      removeAllHreflang();
      return undefined;
    }
    for (const lang of SUPPORTED_LANGS) {
      const href = lang === "zh-CN" ? `${siteOrigin}${path}` : `${siteOrigin}${path}?lang=${lang}`;
      setHreflangLink(lang, href);
    }
    setHreflangLink("x-default", `${siteOrigin}${path}`);
    return () => {
      removeAllHreflang();
    };
  }, [path, enabled]);
}
