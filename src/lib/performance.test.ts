import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const globalCss = [
  "src/styles/global.css",
  "src/styles/base.css",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const mainSource = readFileSync(resolve(root, "src/main.tsx"), "utf8");
const navSource = readFileSync(resolve(root, "src/components/SiteNav.tsx"), "utf8");
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const viteConfig = readFileSync(resolve(root, "vite.config.ts"), "utf8");
const gallerySource = readFileSync(resolve(root, "src/components/Gallery.tsx"), "utf8");

describe("performance budgets", () => {
  it("preloads the featured portfolio image used in the hero", () => {
    expect(mainSource).toContain('"prefetch"');
    expect(mainSource).toContain('"image"');
    expect(mainSource).toContain("gallery-urban-01");
    expect(mainSource).toContain("gallery-garden-01");
    expect(mainSource).toContain("gallery-jiangnan-01");
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

  it("declares static asset caching headers and short API photo caching", () => {
    expect(viteConfig).toContain("headers");
  });

  it("keeps gallery photos out of the precache and runtime-caches them", () => {
    const sw = readFileSync(resolve(root, "dist/sw.js"), "utf8");
    expect(sw).toMatch(/gallery|photos|image/i);
  });

  it("keeps removed cinematic assets out of the public shell", () => {
    expect(existsSync(resolve(root, "src/components/CinematicGalleryScene.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "public/images/cinematic"))).toBe(false);
  });

  it("keeps admin pages out of browser caches and search indexes", () => {
    expect(html).toContain('noindex');
    expect(html).toContain('nofollow');
    expect(html).toContain('noarchive');
  });

  it("lazy-loads gallery images, the lightbox, chat panel, and admin CSS outside the public shell", () => {
    expect(gallerySource).toContain('loading="lazy"');
    expect(gallerySource).toContain("lazy(() => import(\"./Lightbox\"))");
    expect(mainSource).toContain('lazy(() => import("./components/PublicChatWidget")');
    expect(mainSource).toContain('import("./styles/admin.css")');
    expect(viteConfig).toContain("dynamicImport");
  });

  it("renders default homepage data first and defers remote enhancement until idle", () => {
    expect(mainSource).toContain('requestIdleCallback');
    expect(mainSource).toContain("StrictMode");
  });

  it("keeps first-load scroll progress outside the app shell", () => {
    expect(mainSource).toContain('document.body.classList.add("is-loaded")');
    expect(navSource).toContain('style.setProperty("--scroll-progress"');
    expect(globalCss).toContain("body.is-loaded");
    expect(globalCss).toContain(".site-nav::after");
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(appSource).toContain("framer-motion");
    expect(appSource).not.toContain("gsap");
  });

  it("keeps texture and elevation effects CSS-only", () => {
    expect(globalCss).toContain("data:image/svg+xml");
    expect(globalCss).toContain("--paper-noise");
    expect(globalCss).toContain("inset 0");
    expect(globalCss).toContain("vignette");
    expect(globalCss).toContain("will-change: transform");
  });
});
