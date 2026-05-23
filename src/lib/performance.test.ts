import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";

const root = process.cwd();
const html = readFileSync(resolve(root, "index.html"), "utf8");
const globalCss = [
  "src/styles/global.css",
  "src/styles/base.css",
  "src/styles/site.css",
  "src/styles/hero.css",
  "src/styles/gallery.css",
  "src/styles/sections.css",
  "src/styles/chat.css",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const gallerySource = readFileSync(resolve(root, "src/components/Gallery.tsx"), "utf8");
const heroSource = readFileSync(resolve(root, "src/components/Hero.tsx"), "utf8");
const mainSource = readFileSync(resolve(root, "src/main.tsx"), "utf8");
const navSource = readFileSync(resolve(root, "src/components/SiteNav.tsx"), "utf8");
const photosApiSource = readFileSync(resolve(root, "functions/api/photos.ts"), "utf8");
const siteContentHookSource = readFileSync(resolve(root, "src/hooks/useSiteContent.tsx"), "utf8");
const publicPhotosHookSource = readFileSync(resolve(root, "src/hooks/usePublicPhotos.tsx"), "utf8");
const viteConfigSource = readFileSync(resolve(root, "vite.config.ts"), "utf8");
const chatLauncherPath = resolve(root, "src/components/PublicChatLauncher.tsx");
const chatLauncherSource = existsSync(chatLauncherPath)
  ? readFileSync(chatLauncherPath, "utf8")
  : "";

describe("performance resources", () => {
  it("preloads the featured portfolio image used in the hero", () => {
    const heroImage = galleryItems.find((item) => item.featured)?.imageUrl;

    expect(heroImage).toBe("/images/gallery/gallery-jiangnan-01.webp?v=20260427-2");
    expect(html).toContain(`<link rel="preload" as="image" href="${heroImage}"`);
    expect(html).not.toContain('<link rel="preload" as="image" href="/images/cinematic/hero-studio.webp"');
  });

  it("builds responsive variants for static gallery images but not remote R2 images", async () => {
    expect(existsSync(resolve(root, "src/lib/responsive-image.ts"))).toBe(true);
    const { getResponsiveImageAttrs } = await import("./responsive-image");

    expect(getResponsiveImageAttrs("/images/gallery/gallery-garden-01.webp?v=20260427-2", "50vw")).toEqual({
      src: "/images/gallery/gallery-garden-01.webp?v=20260427-2",
      srcSet:
        "/images/gallery/640/gallery-garden-01.webp?v=20260427-2 640w, " +
        "/images/gallery/960/gallery-garden-01.webp?v=20260427-2 960w, " +
        "/images/gallery/gallery-garden-01.webp?v=20260427-2 1200w",
      sizes: "50vw",
    });

    expect(getResponsiveImageAttrs("/api/photos/remote-one/image", "50vw")).toEqual({
      src: "/api/photos/remote-one/image",
    });
  });

  it("ships generated 640w and 960w gallery image variants", () => {
    for (const photo of galleryItems) {
      const fileName = photo.imageUrl.match(/\/images\/gallery\/([^?]+)/)?.[1];
      expect(fileName).toBeTruthy();
      expect(existsSync(resolve(root, "public/images/gallery/640", fileName!))).toBe(true);
      expect(existsSync(resolve(root, "public/images/gallery/960", fileName!))).toBe(true);
    }
  });

  it("uses one self-hosted display font subset without fontsource or font preloads", () => {
    const displayFontPath = resolve(root, "public/fonts/naihuangbao-wenkai-subset.woff2");

    expect(globalCss).not.toContain("fonts.googleapis.com");
    expect(globalCss).not.toContain("@fontsource/nunito");
    expect(globalCss).not.toContain("font-family: \"Nunito\"");
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
    expect(statSync(displayFontPath).size).toBeLessThanOrEqual(220 * 1024);
  });

  it("declares static asset caching headers and short API photo caching", () => {
    const headers = readFileSync(resolve(root, "public/_headers"), "utf8");

    expect(headers).toContain("/assets/*");
    expect(headers).toContain("/images/gallery/*");
    expect(headers).toContain("max-age=31536000");
    expect(photosApiSource).toContain("stale-while-revalidate=300");
  });

  it("keeps gallery photos out of the precache and runtime-caches them", () => {
    expect(viteConfigSource).toContain("globIgnores");
    expect(viteConfigSource).toContain("**/images/gallery/**/*");
    expect(viteConfigSource).not.toContain("**/three.module-*.js");
    expect(viteConfigSource).not.toContain("**/gsap-*.js");
    expect(viteConfigSource).not.toContain("**/ScrollTrigger-*.js");
    expect(viteConfigSource).not.toContain("**/images/cinematic/**/*");
    expect(viteConfigSource).toContain("runtimeCaching");
    expect(viteConfigSource).toContain('url.pathname.startsWith("/images/gallery/")');
    expect(viteConfigSource).toContain('handler: "CacheFirst"');
    expect(viteConfigSource).toContain("maxEntries: 36");
    expect(viteConfigSource).toContain("maxAgeSeconds: 60 * 60 * 24 * 30");
  });

  it("keeps removed cinematic assets out of the public shell", () => {
    expect(existsSync(resolve(root, "src/data/cinematic.ts"))).toBe(false);
    expect(existsSync(resolve(root, "src/components/CinematicGalleryScene.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "public/images/cinematic"))).toBe(false);
    expect(heroSource).not.toContain("ig_");
    expect(gallerySource).not.toContain("ig_");
    expect(mainSource).not.toContain("/images/cinematic/");
  });

  it("keeps admin pages out of browser caches and search indexes", () => {
    const headers = readFileSync(resolve(root, "public/_headers"), "utf8");

    expect(headers).toContain("/admin*");
    expect(headers).toContain("Cache-Control: no-store");
    expect(headers).toContain("X-Robots-Tag: noindex");
  });

  it("lazy-loads gallery images, the lightbox, chat panel, and admin CSS outside the public shell", () => {
    expect(gallerySource).toContain("new IntersectionObserver");
    expect(gallerySource).toContain('rootMargin: "300px"');
    expect(gallerySource).toContain("observer.disconnect()");
    expect(globalCss).toContain(".gallery-skeleton");

    expect(gallerySource).toContain('lazy(() => import("./Lightbox"))');
    expect(appSource).toContain('lazy(() => import("./components/PublicChatWidget"))');
    expect(appSource).toContain("<PublicChatLauncher");
    expect(appSource).not.toContain('import { PublicChatWidget } from "./components/PublicChatWidget"');
    expect(chatLauncherSource).toContain("function PublicChatLauncher");
    expect(chatLauncherSource).not.toContain('fetch("/api/chat"');
    expect(appSource).toContain('import("./components/AdminDashboard")');
    expect(appSource).toContain('import("./styles/admin.css")');
    expect(readFileSync(resolve(root, "src/styles/global.css"), "utf8")).not.toContain(".adm-root");
  });

  it("renders default homepage data first and defers remote enhancement until idle", () => {
    expect(siteContentHookSource).toContain("defaultSiteContent");
    expect(publicPhotosHookSource).toContain("galleryItems");
    expect(siteContentHookSource).toContain("requestIdleCallback");
    expect(publicPhotosHookSource).toContain("requestIdleCallback");
    expect(siteContentHookSource).toContain("AbortController");
    expect(publicPhotosHookSource).toContain("AbortController");
    expect(heroSource).not.toContain("offset *");
    expect(globalCss).toContain("--paper-noise");
  });

  it("keeps first-load motion and scroll progress outside the app shell", () => {
    expect(mainSource).toContain('document.body.classList.add("is-loaded")');
    expect(navSource).toContain('style.setProperty("--scroll-progress"');
    expect(globalCss).toContain("body.is-loaded");
    expect(globalCss).toContain(".site-nav::after");
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(appSource).not.toContain("framer-motion");
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
