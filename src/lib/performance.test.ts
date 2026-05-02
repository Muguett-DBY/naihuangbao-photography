import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";

const root = process.cwd();
const html = readFileSync(resolve(root, "index.html"), "utf8");
const globalCss = readFileSync(resolve(root, "src/styles/global.css"), "utf8");
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const gallerySource = readFileSync(resolve(root, "src/components/Gallery.tsx"), "utf8");
const heroSource = readFileSync(resolve(root, "src/components/Hero.tsx"), "utf8");
const mainSource = readFileSync(resolve(root, "src/main.tsx"), "utf8");
const navSource = readFileSync(resolve(root, "src/components/SiteNav.tsx"), "utf8");
const parallaxSource = readFileSync(resolve(root, "src/hooks/useParallax.ts"), "utf8");
const photosApiSource = readFileSync(resolve(root, "functions/api/photos.ts"), "utf8");

describe("performance resources", () => {
  it("preloads the actual static hero image with the gallery asset version", () => {
    const heroImage = galleryItems.find((item) => item.featured)?.imageUrl;

    expect(heroImage).toBe("/images/gallery/gallery-jiangnan-01.webp?v=20260427-2");
    expect(html).toContain(`<link rel="preload" as="image" href="${heroImage}"`);
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

  it("self-hosts the display font and avoids runtime Google Fonts import", () => {
    expect(globalCss).not.toContain("fonts.googleapis.com");
    expect(globalCss).toContain("@font-face");
    expect(globalCss).toContain("font-display: swap");
    expect(existsSync(resolve(root, "public/fonts/cormorant-garamond.woff2"))).toBe(true);
  });

  it("declares static asset caching headers and short API photo caching", () => {
    const headers = readFileSync(resolve(root, "public/_headers"), "utf8");

    expect(headers).toContain("/assets/*");
    expect(headers).toContain("/images/gallery/*");
    expect(headers).toContain("max-age=31536000");
    expect(photosApiSource).toContain("stale-while-revalidate=300");
  });

  it("keeps admin pages out of browser caches and search indexes", () => {
    const headers = readFileSync(resolve(root, "public/_headers"), "utf8");

    expect(headers).toContain("/admin*");
    expect(headers).toContain("Cache-Control: no-store");
    expect(headers).toContain("X-Robots-Tag: noindex");
  });

  it("lazy-loads gallery images, the lightbox, and admin CSS outside the public shell", () => {
    expect(gallerySource).toContain("new IntersectionObserver");
    expect(gallerySource).toContain('rootMargin: "200px"');
    expect(gallerySource).toContain("observer.disconnect()");
    expect(globalCss).toContain(".gallery-skeleton");

    expect(gallerySource).toContain('lazy(() => import("./Lightbox"))');
    expect(appSource).toContain('import("./components/AdminDashboard")');
    expect(appSource).toContain('import("./styles/admin.css")');
    expect(globalCss).not.toContain(".adm-root");
  });

  it("updates parallax with a CSS variable instead of scroll-time React state", () => {
    expect(parallaxSource).not.toContain("useState");
    expect(parallaxSource).not.toContain("setOffset");
    expect(parallaxSource).toContain('style.setProperty("--parallax-offset"');
    expect(parallaxSource).toContain("requestAnimationFrame");
    expect(heroSource).not.toContain("offset *");
    expect(globalCss).toContain("--parallax-offset");
  });

  it("adds first-load motion and scroll progress without large animation libraries", () => {
    expect(mainSource).toContain('document.body.classList.add("is-loaded")');
    expect(navSource).toContain('style.setProperty("--scroll-progress"');
    expect(globalCss).toContain("body.is-loaded");
    expect(globalCss).toContain(".site-nav::after");
    expect(globalCss).toContain("hero-card-large");
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
