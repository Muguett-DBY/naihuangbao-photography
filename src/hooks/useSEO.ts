import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { defaultShareImage, siteOrigin } from "../lib/site-origin";


interface SEOOptions {
  title?: string;
  titleKey?: string;
  descKey: string;
  descParams?: Record<string, string>;
  image?: string;
  imageAlt?: string;
  path?: string;
}

function setMeta(property: string, content: string, isName?: boolean) {
  const attr = isName ? "name" : "property";
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function formatSeoTitle(title: string, siteName: string) {
  const normalizedTitle = title.trim();
  const normalizedSiteName = siteName.trim();
  if (!normalizedTitle) return normalizedSiteName;
  if (!normalizedSiteName || normalizedTitle.includes(normalizedSiteName)) return normalizedTitle;
  return `${normalizedTitle} | ${normalizedSiteName}`;
}

export function useSEO({
  title,
  titleKey,
  descKey,
  descParams,
  image,
  imageAlt,
  path,
}: SEOOptions) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const resolvedTitle = title || (titleKey ? t(titleKey as any) : "");
    const description = t(descKey as any, descParams as any);
    const shareImage = image || defaultShareImage;
    const url = path ? `${siteOrigin}${path}` : siteOrigin;

    document.title = formatSeoTitle(resolvedTitle, t("seo.siteName"));

    setMeta("description", description, true);
    setMeta("og:title", resolvedTitle);
    setMeta("og:description", description);
    setMeta("og:image", shareImage);
    setMeta("og:url", url);
    setMeta("twitter:title", resolvedTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", shareImage);
    if (imageAlt) {
      setMeta("og:image:alt", imageAlt);
      setMeta("twitter:image:alt", imageAlt);
    }

    return () => {
      document.title = t("seo.siteTagline");
    };
  }, [i18n.language, title, titleKey, descKey, descParams, image, imageAlt, path, t]);
}
