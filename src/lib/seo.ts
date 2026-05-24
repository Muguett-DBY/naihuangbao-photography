import { defaultSiteContent } from "../data/content";
import { faqs } from "../data/faq";
import { galleryItems } from "../data/gallery";
import type { SiteContent } from "../types/content";

const siteOrigin = "https://shoot.custard.top";
const shareImage = `${siteOrigin}/wechat-share.jpg`;

export function buildSeoMetadata(content: SiteContent = defaultSiteContent) {
  const title = `${content.siteConfig.brandName}｜${content.siteConfig.tagline}`;
  const description = `${content.siteConfig.brandName}，${content.siteConfig.city}女生写真与情侣约拍。提供南京约拍、南京个人写真、南京江南感写真、室内写真与室外约拍，主打温柔自然、柔雾胶片感和尊重隐私的小红书约拍体验。`;
  const keywords = [
    content.siteConfig.brandName,
    `${content.siteConfig.city}女生写真`,
    `${content.siteConfig.city}情侣约拍`,
    `${content.siteConfig.city}约拍`,
    `${content.siteConfig.city}个人摄影`,
    `${content.siteConfig.city}个人写真`,
    `${content.siteConfig.city}江南感写真`,
    "小红书约拍",
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
  const mainEntity = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${metadata.origin}/#business`,
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
    telephone: "",
    serviceType: [
      `${content.siteConfig.city}女生写真`,
      `${content.siteConfig.city}情侣约拍`,
      `${content.siteConfig.city}个人摄影`,
      `${content.siteConfig.city}个人写真`,
      `${content.siteConfig.city}江南感写真`,
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

  // FAQPage schema — enables rich FAQ results in SERPs
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
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
    '<link rel="preload" as="image" href="/images/gallery/gallery-jiangnan-01.webp?v=20260427-2" imagesizes="(max-width: 900px) 86vw, 38vw" />',
    '<link rel="icon" href="/icons/pwa-icon.svg" />',
    '<script type="application/ld+json">',
    JSON.stringify(mainEntity, null, 6),
    "</script>",
    '<script type="application/ld+json">',
    JSON.stringify(faqSchema, null, 6),
    "</script>",
    // Google Search Console verification (replace with your own ID)
    // '<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />',
    // hreflang for Chinese locale
    '<link rel="alternate" hreflang="zh-CN" href="https://shoot.custard.top/" />',
    '<link rel="alternate" hreflang="x-default" href="https://shoot.custard.top/" />',
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
