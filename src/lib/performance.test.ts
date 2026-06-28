import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const globalCss = [
  "src/styles/global.css",
  "src/styles/base.css",
].map((p) => readFileSync(resolve(root, p), "utf8")).join("\n");
const allCss = [
  "src/styles/global.css",
  "src/styles/base.css",
  "src/styles/site.css",
  "src/styles/hero.css",
  "src/styles/gallery.css",
  "src/styles/sections.css",
  "src/styles/chat.css",
].map((p) => readFileSync(resolve(root, p), "utf8")).join("\n");
const mainSource = readFileSync(resolve(root, "src/main.tsx"), "utf8");
const rootLayoutSource = readFileSync(resolve(root, "src/layouts/RootLayout.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "src/router.tsx"), "utf8");
const routePreloadSource = readFileSync(resolve(root, "src/lib/route-preload.ts"), "utf8");
const navSource = readFileSync(resolve(root, "src/hooks/useGsapAnimations.ts"), "utf8");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const viteConfig = readFileSync(resolve(root, "vite.config.ts"), "utf8");
const gallerySource = readFileSync(resolve(root, "src/components/Gallery.tsx"), "utf8");
const headerSource = readFileSync(resolve(root, "src/components/shared/Header.tsx"), "utf8");
const mobileNavSource = readFileSync(resolve(root, "src/components/shared/MobileBottomNav.tsx"), "utf8");
const footerSource = readFileSync(resolve(root, "src/components/shared/Footer.tsx"), "utf8");
const budgetSource = readFileSync(resolve(root, "scripts/check-performance-budget.mjs"), "utf8");
const localeFiles = [
  "src/i18n/locales/zh-CN.json",
  "src/i18n/locales/en.json",
  "src/i18n/locales/ja.json",
  "src/i18n/locales/ko.json",
];

describe("performance budgets", () => {
  it("keeps route-only page styles out of the initial public shell", () => {
    const siteCss = readFileSync(resolve(root, "src/styles/site.css"), "utf8");
    const routedPages = [
      "BookingPage.tsx",
      "CourseDetailPage.tsx",
      "CoursesPage.tsx",
      "DashboardPage.tsx",
      "GalleryPage.tsx",
      "HomePage.tsx",
      "LoginPage.tsx",
      "MapPage.tsx",
      "PhotoDetailPage.tsx",
      "PhotoEditorPage.tsx",
      "PresetDetailPage.tsx",
      "ProductsPage.tsx",
      "ShopDetailPage.tsx",
      "ShopPage.tsx",
      "WorkshopDetailPage.tsx",
      "WorkshopsPage.tsx",
    ];

    expect(siteCss).not.toContain('@import "./pages.css"');
    for (const page of routedPages) {
      expect(readFileSync(resolve(root, "src/pages", page), "utf8")).toContain('import "../styles/pages.css"');
    }
  });

  it("prefetches featured portfolio images without global render-blocking image preloads", () => {
    expect(mainSource).toContain('"prefetch"');
    expect(mainSource).toContain('"image"');
    expect(mainSource).toContain("gallery-urban-01");
    expect(mainSource).toContain("gallery-garden-01");
    expect(mainSource).toContain("gallery-jiangnan-01");
    expect(html).not.toContain('rel="preload" as="image" href="/images/gallery/');
  });

  it("builds responsive variants for static gallery images but not remote R2 images", () => {
    expect(viteConfig).toContain("gallery");
    expect(viteConfig).not.toContain("r2");
    expect(gallerySource).toContain("/images/gallery/640/");
  });

  it("ships generated 640w and 960w gallery image variants", () => {
    expect(existsSync(resolve(root, "public/images/gallery/640"))).toBe(true);
    expect(existsSync(resolve(root, "public/images/gallery/960"))).toBe(true);
  });

  it("serves body fonts via fontsource and keeps display fonts self-hosted", () => {
    const displayFontPath = resolve(root, "public/fonts/naihuangbao-wenkai-subset.woff2");
    expect(globalCss).not.toContain("fonts.googleapis.com");
    expect(globalCss).toContain("@fontsource/nunito");
    expect(globalCss).toContain('font-family: "Naihuangbao WenKai"');
    expect(globalCss).toContain("/fonts/naihuangbao-wenkai-subset.woff2");
    expect(globalCss).toContain("font-display: swap");
    expect(globalCss).toContain("--font-display-cn");
    expect(globalCss).toContain("--font-heading: var(--font-heading-cn)");
    expect(globalCss).toContain("--font-ui: var(--font-body)");
    expect(html).not.toContain('rel="preload" as="font"');
    expect(html).not.toContain("/node_modules/@fontsource");
    expect(existsSync(resolve(root, "public/fonts/cormorant-garamond.woff2"))).toBe(false);
    expect(existsSync(resolve(root, "public/fonts/inter.woff2"))).toBe(false);
    expect(existsSync(displayFontPath)).toBe(true);
  });

  it("lazy-loads gallery images and non-critical chunks", () => {
    expect(gallerySource).toContain('loading="lazy"');
    expect(gallerySource).toContain('lazy(() => import("./Lightbox"))');
    expect(rootLayoutSource).toContain('lazy(() => import("../components/PublicChatWidget")');
    expect(routePreloadSource).toContain('import("../styles/admin.css")');
  });

  it("preloads primary routes on navigation intent", () => {
    expect(routerSource).toContain("routeLoaders");
    expect(headerSource).toContain("PrefetchLink");
    expect(mobileNavSource).toContain("PrefetchLink");
    expect(footerSource).toContain("PrefetchLink");
  });

  it("keeps footer discovery links on real lazy-rendered sections", () => {
    expect(footerSource).not.toContain('to="/about"');
    expect(footerSource).not.toContain('to="/faq"');
    expect(footerSource).toContain('to="/#why"');
    expect(footerSource).toContain('to="/booking#faq"');
    for (const localeFile of localeFiles) {
      const locale = JSON.parse(readFileSync(resolve(root, localeFile), "utf8"));
      expect(locale.nav.about).toBeTruthy();
    }
    expect(rootLayoutSource).toContain("RouteHashScroller");
  });

  it("strips component-library font faces and budgets emitted fonts", () => {
    expect(viteConfig).toContain("stripAnimalIslandFonts()");
    expect(budgetSource).toContain("maxFontAssetBytes");
    expect(budgetSource).toContain("Font asset budget exceeded");
  });

  it("renders default homepage data first and defers remote enhancement until idle", () => {
    expect(mainSource).toContain("requestIdleCallback");
    expect(mainSource).toContain("StrictMode");
  });

  it("keeps first-load reveal and scroll progress outside the app shell", () => {
    expect(mainSource).toContain('document.body.classList.add("is-loaded")');
    expect(navSource).toContain('scroll-progress-bar');
    expect(allCss).toContain("body.is-loaded");
    expect(allCss).toContain(".site-nav::after");
    expect(allCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(rootLayoutSource).toContain("Outlet");
  });

  it("keeps removed cinematic assets out of the public shell", () => {
    expect(existsSync(resolve(root, "src/components/CinematicGalleryScene.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "public/images/cinematic"))).toBe(false);
  });

  it("keeps texture and elevation effects CSS-only", () => {
    expect(allCss).toContain("data:image/svg+xml");
    expect(allCss).toContain("--paper-noise");
    expect(allCss).toContain("inset 0");
    expect(allCss).toContain("vignette");
    expect(allCss).toContain("will-change: transform");
  });

  it("keeps gallery photos out of the precache and runtime-caches them", () => {
    // Verify Vite PWA config runtime-caches gallery images
    expect(viteConfig).toContain("runtimeCaching");
    expect(viteConfig).toContain("gallery-images");
    expect(viteConfig).toContain('handler: "CacheFirst"');
    expect(viteConfig).toContain("NetworkFirst");
    // Verify precache excludes gallery images
    expect(viteConfig).toContain("globIgnores");
    expect(viteConfig).toContain("gallery");
  });


});
