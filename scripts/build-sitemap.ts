import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const galleryItems = [
  { id: "gallery-jiangnan-01", title: "南京江南感写真｜女生约拍", caption: "奶黄包摄影南京女生写真，江南感风格" },
  { id: "gallery-jiangnan-02", title: "南京探店写真｜室内约拍", caption: "南京室内写真约拍，柔雾胶片感" },
  { id: "gallery-street-01", title: "南京街拍写真｜室外约拍", caption: "南京街拍女生写真，自然光日常记录" },
  { id: "gallery-couple-01", title: "南京情侣约拍｜室外写真", caption: "南京情侣约拍，自然甜蜜风格" },
  { id: "gallery-sweet-01", title: "南京甜系写真｜室内棚拍", caption: "南京甜系女生写真，温柔柔雾风格" },
  { id: "gallery-park-01", title: "南京公园写真｜自然光约拍", caption: "南京公园女生写真，自然柔光风格" },
];

const SITE_ORIGIN = "https://shoot.custard.top";
const LANGS = ["zh-CN", "en", "ja", "ko"];

const STATIC_PAGES = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/gallery", priority: 0.9, changefreq: "weekly" },
  { path: "/booking", priority: 0.9, changefreq: "monthly" },
  { path: "/courses", priority: 0.7, changefreq: "weekly" },
  { path: "/products", priority: 0.7, changefreq: "weekly" },
  { path: "/workshops", priority: 0.7, changefreq: "weekly" },
  { path: "/shop", priority: 0.6, changefreq: "weekly" },
  { path: "/map", priority: 0.6, changefreq: "monthly" },
];

const today = new Date().toISOString().slice(0, 10);

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, priority: number, changefreq: string, extra: string[] = []) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    ...extra,
    "  </url>",
  ].join("\n");
}

function hreflangLinks(path: string) {
  return LANGS.map((lang) => {
    const href = `${SITE_ORIGIN}${path}`;
    const fullHref = lang === "zh-CN" ? href : `${href}?lang=${lang}`;
    return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(fullHref)}" />`;
  }).concat([`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_ORIGIN}${path}`)}" />`]);
}

function buildSitemap() {
  const entries: string[] = [];

  for (const page of STATIC_PAGES) {
    const url = `${SITE_ORIGIN}${page.path}`;
    const extra: string[] = [];
    if (page.path === "/") {
      for (const item of galleryItems) {
        extra.push("    <image:image>");
        extra.push(`      <image:loc>${escapeXml(`${SITE_ORIGIN}/images/gallery/${item.id}.webp`)}</image:loc>`);
        extra.push(`      <image:title>${escapeXml(item.title)}</image:title>`);
        extra.push(`      <image:caption>${escapeXml(item.caption)}</image:caption>`);
        extra.push("    </image:image>");
      }
    }
    extra.push(...hreflangLinks(page.path));
    entries.push(urlEntry(url, page.priority, page.changefreq, extra));
  }

  for (const item of galleryItems) {
    const path = `/gallery/${item.id}`;
    const url = `${SITE_ORIGIN}${path}`;
    const extra = hreflangLinks(path);
    entries.push(urlEntry(url, 0.6, "monthly", extra));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

function buildSitemapIndex() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(`${SITE_ORIGIN}/sitemap.xml`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`;
}

function writeOutput(name: string, content: string) {
  const here = dirname(fileURLToPath(import.meta.url));
  const target = resolve(here, "..", "public", name);
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target)) {
    mkdirSync(dirname(target), { recursive: true });
  }
  writeFileSync(target, content, "utf8");
  console.log(`✓ Wrote ${name} (${content.length} bytes)`);
}

writeOutput("sitemap.xml", buildSitemap());
writeOutput("sitemap-index.xml", buildSitemapIndex());
