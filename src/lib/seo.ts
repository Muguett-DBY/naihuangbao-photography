import { archiveProjects } from "../data/living-archive";
import { defaultSiteContent } from "../data/content";
import { galleryItems } from "../data/gallery";
import type { SiteContent } from "../types/content";
import { defaultShareImage, siteOrigin } from "./site-origin";

export function buildSeoMetadata(content: SiteContent = defaultSiteContent) {
  const title = `${content.siteConfig.brandName}｜${content.siteConfig.tagline}`;
  const description = content.siteConfig.description;
  const keywords = [
    content.siteConfig.brandName,
    "南京约拍",
    "南京写真",
    "女生写真",
    "情侣约拍",
    "个人摄影师",
    "自然光人像",
    "城市旅拍",
    content.siteConfig.city,
  ].join(",");
  const featuredImages = galleryItems.slice(0, 4).map((photo) => (
    `${siteOrigin}${photo.imageUrl.replace(/\?.*$/, "")}`
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
    alternateName: "NHB Portrait Booking",
    description: metadata.description,
    url: `${metadata.origin}/`,
    image: [metadata.shareImage, ...metadata.featuredImages],
    inLanguage: ["zh-CN", "en", "ja", "ko"],
    keywords: metadata.keywords,
  };

  const gallerySchema = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "@id": `${metadata.origin}/gallery#collection`,
    name: "奶黄包摄影真实作品集",
    description: "南京女生写真、情侣约拍与城市旅拍的真实授权作品。",
    url: `${metadata.origin}/gallery`,
    isPartOf: { "@id": `${metadata.origin}/#website` },
    hasPart: galleryItems.map((photo) => ({
      "@type": "Photograph",
      name: photo.title,
      description: photo.alt,
      url: `${metadata.origin}/gallery/${photo.id}`,
      image: `${metadata.origin}${photo.imageUrl.replace(/\?.*$/, "")}`,
      contentLocation: photo.location,
    })),
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
      { "@type": "ListItem", position: 2, name: "作品集", item: `${metadata.origin}/gallery` },
      { "@type": "ListItem", position: 3, name: "预约", item: `${metadata.origin}/booking` },
      { "@type": "ListItem", position: 4, name: "关于", item: `${metadata.origin}/about` },
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
    JSON.stringify(gallerySchema, null, 6),
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
