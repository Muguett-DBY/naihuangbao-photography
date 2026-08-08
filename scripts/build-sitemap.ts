import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const galleryItems = [
  { id: "gallery-jiangnan-01", title: "伞下春光", caption: "南京园林中的江南感人像作品" },
  { id: "gallery-urban-01", title: "台阶午后", caption: "南京室内台阶场景的都市人像作品" },
  { id: "gallery-garden-01", title: "绿意裙摆", caption: "南京公园绿意与纸伞人像作品" },
  { id: "gallery-sweet-01", title: "黄 hoodie 街角", caption: "南京街区日常人像作品" },
  { id: "gallery-flower-01", title: "花墙紫调", caption: "南京花墙前的柔和人像作品" },
  { id: "gallery-daily-01", title: "廊下白衬衫", caption: "南京公园廊下的日常人像作品" },
];

const SITE_ORIGIN = "https://shoot.custard.top";
const LANGS = ["zh-CN", "en", "ja", "ko"];

const STATIC_PAGES = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/archive", priority: 0.9, changefreq: "weekly" },
  { path: "/stories", priority: 0.8, changefreq: "weekly" },
  { path: "/create", priority: 0.9, changefreq: "monthly" },
  { path: "/create/story", priority: 0.7, changefreq: "monthly" },
  { path: "/studio", priority: 0.8, changefreq: "monthly" },
  { path: "/practice", priority: 0.6, changefreq: "monthly" },
  { path: "/about", priority: 0.7, changefreq: "monthly" },
  { path: "/gallery", priority: 0.7, changefreq: "monthly" },
  { path: "/map", priority: 0.5, changefreq: "monthly" },
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
  const archiveProjects = JSON.parse(readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/archive-projects.generated.json"),
    "utf8",
  )) as Array<{ id: string; title: string; subtitle: string; media: Array<{ src: string }> }>;
  const visualStories = JSON.parse(readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/visual-stories.generated.json"),
    "utf8",
  )) as Array<{ id: string; title: string; subtitle: string; chapters: Array<{ media: Array<{ src: string }> }> }>;

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

  for (const project of archiveProjects) {
    const path = `/archive/${project.id}`;
    const extra = [
      ...hreflangLinks(path),
      "    <image:image>",
      `      <image:loc>${escapeXml(`${SITE_ORIGIN}${project.media[0].src}`)}</image:loc>`,
      `      <image:title>${escapeXml(project.title)}</image:title>`,
      `      <image:caption>${escapeXml(project.subtitle)}</image:caption>`,
      "    </image:image>",
    ];
    entries.push(urlEntry(`${SITE_ORIGIN}${path}`, 0.8, "monthly", extra));
  }

  for (const story of visualStories) {
    const path = `/stories/${story.id}`;
    const cover = story.chapters[0].media[0];
    const extra = [
      ...hreflangLinks(path),
      "    <image:image>",
      `      <image:loc>${escapeXml(`${SITE_ORIGIN}${cover.src}`)}</image:loc>`,
      `      <image:title>${escapeXml(story.title)}</image:title>`,
      `      <image:caption>${escapeXml(story.subtitle)}</image:caption>`,
      "    </image:image>",
    ];
    entries.push(urlEntry(`${SITE_ORIGIN}${path}`, 0.8, "monthly", extra));
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
