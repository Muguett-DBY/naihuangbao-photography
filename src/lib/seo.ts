import { archiveProjects } from "../data/living-archive";
import { defaultSiteContent } from "../data/content";
import type { SiteContent } from "../types/content";
import { defaultShareImage, siteOrigin } from "./site-origin";

export function buildSeoMetadata(content: SiteContent = defaultSiteContent) {
  const title = `${content.siteConfig.brandName}｜${content.siteConfig.tagline}`;
  const description = content.siteConfig.description;
  const keywords = [
    content.siteConfig.brandName,
    "个人视觉档案",
    "视觉实验",
    "互动叙事",
    "浏览器图形",
    "本地创作工具",
    "摄影练习",
    content.siteConfig.city,
  ].join(",");
  const featuredImages = archiveProjects.slice(0, 4).map((project) => (
    `${siteOrigin}${project.media[0].src.replace(/\?.*$/, "")}`
  ));

  return {
    title,
    description,
    keywords,
    origin: siteOrigin,
    shareImage: defaultShareImage,
    themeColor: "#F5E6D3",
    featuredImages,
  };
}

export function renderSeoHead(content: SiteContent = defaultSiteContent) {
  const metadata = buildSeoMetadata(content);
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${metadata.origin}/#website`,
    name: content.siteConfig.brandName,
    alternateName: "NHB Visual OS",
    description: metadata.description,
    url: `${metadata.origin}/`,
    image: [metadata.shareImage, ...metadata.featuredImages],
    inLanguage: ["zh-CN", "en", "ja", "ko"],
    keywords: metadata.keywords,
  };

  const archiveSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${metadata.origin}/archive#collection`,
    name: "NHB Living Archive",
    description: "持续生长的无人物概念研究、视觉实验和过程笔记。",
    url: `${metadata.origin}/archive`,
    isPartOf: { "@id": `${metadata.origin}/#website` },
    hasPart: archiveProjects.map((project) => ({
      "@type": "CreativeWork",
      name: project.title,
      description: project.summary,
      url: `${metadata.origin}/archive/${project.id}`,
      image: `${metadata.origin}${project.media[0].src}`,
      datePublished: project.publishedAt,
      genre: project.mediums,
      keywords: project.keywords.join(","),
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: `${metadata.origin}/` },
      { "@type": "ListItem", position: 2, name: "档案", item: `${metadata.origin}/archive` },
      { "@type": "ListItem", position: 3, name: "故事", item: `${metadata.origin}/stories` },
      { "@type": "ListItem", position: 4, name: "创作", item: `${metadata.origin}/create` },
    ],
  };

  return [
    '<meta name="robots" content="index,follow" />',
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(metadata.keywords)}" />`,
    `<meta name="theme-color" content="${metadata.themeColor}" />`,
    `<meta name="apple-mobile-web-app-title" content="${escapeHtml(content.siteConfig.brandName)}" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${metadata.origin}/" />`,
    `<meta property="og:site_name" content="${escapeHtml(content.siteConfig.brandName)}" />`,
    `<meta property="og:image" content="${metadata.shareImage}" />`,
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="900" />',
    '<meta property="og:image:height" content="500" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="twitter:image" content="${metadata.shareImage}" />`,
    `<meta itemprop="image" content="${metadata.shareImage}" />`,
    `<link rel="canonical" href="${metadata.origin}/" />`,
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<link rel="icon" href="/icons/pwa-icon.svg" />',
    '<script type="application/ld+json">',
    JSON.stringify(websiteSchema, null, 6),
    "</script>",
    '<script type="application/ld+json">',
    JSON.stringify(archiveSchema, null, 6),
    "</script>",
    '<script type="application/ld+json">',
    JSON.stringify(breadcrumbSchema, null, 6),
    "</script>",
    `<link rel="alternate" hreflang="zh-CN" href="${metadata.origin}/" />`,
    `<link rel="alternate" hreflang="en" href="${metadata.origin}/?lang=en" />`,
    `<link rel="alternate" hreflang="ja" href="${metadata.origin}/?lang=ja" />`,
    `<link rel="alternate" hreflang="ko" href="${metadata.origin}/?lang=ko" />`,
    `<link rel="alternate" hreflang="x-default" href="${metadata.origin}/" />`,
    `<title>${escapeHtml(metadata.title)}</title>`,
  ].join("\n    ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
