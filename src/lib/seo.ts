import { defaultSiteContent } from "../data/content";
import { galleryItems } from "../data/gallery";
import type { SiteContent } from "../types/content";

const siteOrigin = "https://shoot.custard.top";
const shareImage = `${siteOrigin}/wechat-share.jpg`;

export function buildSeoMetadata(content: SiteContent = defaultSiteContent) {
  const title = `${content.siteConfig.brandName}｜${content.siteConfig.tagline}`;
  const description = `${content.siteConfig.brandName}，${content.siteConfig.city}女生写真与情侣约拍。提供室内写真、室外约拍、拍立得加拍，主打温柔自然、柔雾胶片感和尊重隐私的个人摄影服务。`;
  const keywords = [
    content.siteConfig.brandName,
    `${content.siteConfig.city}女生写真`,
    `${content.siteConfig.city}情侣约拍`,
    `${content.siteConfig.city}约拍`,
    `${content.siteConfig.city}个人摄影`,
    "女生写真",
    "情侣写真",
  ].join(",");
  const featuredImages = galleryItems.slice(0, 3).map((photo) => (
    `${siteOrigin}${photo.imageUrl.replace(/\?.*$/, "")}`
  ));

  return {
    title,
    description,
    keywords,
    origin: siteOrigin,
    shareImage,
    themeColor: "#F5E6D3",
    featuredImages,
    priceRange: content.packages.map((item) => item.price).join("-"),
  };
}

export function renderSeoHead(content: SiteContent = defaultSiteContent) {
  const metadata = buildSeoMetadata(content);
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: content.siteConfig.brandName,
    alternateName: `${content.siteConfig.brandName}约拍`,
    description: metadata.description,
    url: `${metadata.origin}/`,
    image: [metadata.shareImage, ...metadata.featuredImages],
    areaServed: {
      "@type": "City",
      name: content.siteConfig.city,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: content.siteConfig.city,
      addressCountry: "CN",
    },
    serviceType: [
      `${content.siteConfig.city}女生写真`,
      `${content.siteConfig.city}情侣约拍`,
      `${content.siteConfig.city}个人摄影`,
      `${content.siteConfig.city}约拍`,
    ],
    priceRange: metadata.priceRange,
    sameAs: [content.siteConfig.xiaohongshuProfile],
    offers: content.packages.map((item) => ({
      "@type": "Offer",
      name: item.name,
      price: item.price.replace(/[^\d.]/g, ""),
      priceCurrency: "CNY",
      description: `${item.name} ${item.price}，${item.duration}。`,
    })),
  };

  return [
    '<meta name="robots" content="index,follow" />',
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(metadata.keywords)}" />`,
    `<meta name="theme-color" content="${metadata.themeColor}" />`,
    `<meta name="apple-mobile-web-app-title" content="${escapeHtml(content.siteConfig.brandName)}" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(content.siteConfig.description)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${metadata.origin}/" />`,
    `<meta property="og:site_name" content="${escapeHtml(content.siteConfig.brandName)}" />`,
    `<meta property="og:image" content="${metadata.shareImage}" />`,
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="900" />',
    '<meta property="og:image:height" content="500" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(content.siteConfig.description)}" />`,
    `<meta name="twitter:image" content="${metadata.shareImage}" />`,
    `<meta itemprop="image" content="${metadata.shareImage}" />`,
    `<link rel="canonical" href="${metadata.origin}/" />`,
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<link rel="preload" as="image" href="/images/gallery/gallery-jiangnan-01.webp?v=20260427-2" imagesrcset="/images/gallery/640/gallery-jiangnan-01.webp?v=20260427-2 640w, /images/gallery/960/gallery-jiangnan-01.webp?v=20260427-2 960w, /images/gallery/gallery-jiangnan-01.webp?v=20260427-2 1200w" imagesizes="(max-width: 900px) 92vw, 48vw" />',
    '<link rel="icon" href="/icons/pwa-icon.svg" />',
    '<script type="application/ld+json">',
    JSON.stringify(schema, null, 6),
    "</script>",
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
