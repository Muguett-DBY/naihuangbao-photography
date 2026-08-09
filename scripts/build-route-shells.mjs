import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const siteOrigin = "https://shoot.custard.top";
const brand = "奶黄包摄影";
const template = await readFile(join(dist, "index.html"), "utf8");
const archiveManifest = JSON.parse(await readFile(resolve(root, "public/archive-manifest.json"), "utf8"));
const storyManifest = JSON.parse(await readFile(resolve(root, "public/story-manifest.json"), "utf8"));

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function absoluteAsset(src) {
  return `${siteOrigin}${String(src).replace(/\?.*$/, "")}`;
}

function safeJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function renderRouteHead(route) {
  const canonical = `${siteOrigin}${route.path}`;
  const title = `${route.title}｜${brand}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": route.schemaType,
    "@id": `${canonical}#work`,
    name: route.title,
    headline: route.title,
    description: route.description,
    url: canonical,
    image: absoluteAsset(route.image.src),
    datePublished: route.publishedAt,
    inLanguage: "zh-CN",
    isPartOf: { "@id": `${siteOrigin}/#website` },
    keywords: route.keywords.join(","),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: `${siteOrigin}/` },
      { "@type": "ListItem", position: 2, name: route.sectionLabel, item: `${siteOrigin}${route.sectionPath}` },
      { "@type": "ListItem", position: 3, name: route.title, item: canonical },
    ],
  };
  return [
    "<!-- seo:generated:start -->",
    '    <meta name="robots" content="index,follow" />',
    `    <meta name="description" content="${escapeHtml(route.description)}" />`,
    `    <meta name="keywords" content="${escapeHtml(route.keywords.join(","))}" />`,
    '    <meta name="theme-color" content="#F5E6D3" />',
    `    <meta property="og:title" content="${escapeHtml(title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `    <meta property="og:type" content="${route.schemaType === "Article" ? "article" : "website"}" />`,
    `    <meta property="og:url" content="${canonical}" />`,
    `    <meta property="og:site_name" content="${brand}" />`,
    `    <meta property="og:image" content="${absoluteAsset(route.image.src)}" />`,
    `    <meta property="og:image:width" content="${route.image.width}" />`,
    `    <meta property="og:image:height" content="${route.image.height}" />`,
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `    <meta name="twitter:image" content="${absoluteAsset(route.image.src)}" />`,
    `    <link rel="canonical" href="${canonical}" />`,
    '    <link rel="manifest" href="/manifest.webmanifest" />',
    '    <link rel="icon" href="/icons/pwa-icon.svg" />',
    `    <script type="application/ld+json">${safeJson(schema)}</script>`,
    `    <script type="application/ld+json">${safeJson(breadcrumbs)}</script>`,
    `    <title>${escapeHtml(title)}</title>`,
    "    <!-- seo:generated:end -->",
  ].join("\n");
}

function renderStaticBody(route) {
  return `<main data-static-route-shell style="max-width:1200px;margin:0 auto;padding:120px 6vw 80px;color:#203128;font-family:system-ui,sans-serif"><p style="font-size:12px;font-weight:800">NHB / ${escapeHtml(route.sectionLabel.toUpperCase())}</p><h1 style="max-width:900px;margin:18px 0;font-size:clamp(48px,8vw,112px);line-height:.9">${escapeHtml(route.title)}</h1><p style="max-width:680px;font-size:18px;line-height:1.7">${escapeHtml(route.description)}</p><img src="${escapeHtml(route.image.src)}" alt="${escapeHtml(route.image.alt)}" width="${route.image.width}" height="${route.image.height}" style="display:block;width:100%;height:auto;margin-top:48px" /></main>`;
}

async function writeRoute(route) {
  const headPattern = /<!-- seo:generated:start -->[\s\S]*?<!-- seo:generated:end -->/;
  if (!headPattern.test(template)) throw new Error("Built index is missing the generated SEO block");
  const html = template
    .replace(headPattern, renderRouteHead(route))
    .replace(/<div id="root"><\/div>/, `<div id="root">${renderStaticBody(route)}</div>`);
  const outputDirectory = join(dist, route.path.replace(/^\//, ""));
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "index.html"), html, "utf8");
}

const routes = [
  ...archiveManifest.projects.map((project) => ({
    path: `/archive/${project.id}`,
    sectionPath: "/archive",
    sectionLabel: "Living Archive",
    schemaType: "CreativeWork",
    title: project.title,
    description: project.summary,
    publishedAt: project.publishedAt,
    keywords: [...project.keywords, ...project.mediums],
    image: project.media[0],
  })),
  ...storyManifest.stories.map((story) => ({
    path: `/stories/${story.id}`,
    sectionPath: "/stories",
    sectionLabel: "Visual Stories",
    schemaType: "Article",
    title: story.title,
    description: story.summary,
    publishedAt: story.publishedAt,
    keywords: ["视觉故事", "概念影像", ...story.chapters.map((chapter) => chapter.title)],
    image: story.chapters[0].media[0],
  })),
];

await Promise.all(routes.map(writeRoute));
console.log(`Built ${routes.length} route-specific static SEO shells.`);
