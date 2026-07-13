import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("editorial public-page reconstruction contracts", () => {
  it("uses an image-first home cover without decorative drift", () => {
    const home = read("src/pages/HomePage.tsx");

    expect(home).toContain('className="hero hero-home"');
    expect(home).toContain('className="hero-contact-sheet"');
    expect(home).toContain('className="hero-issue-line"');
    expect(home).toContain('className="hero-cover-primary-btn"');
    expect(home).toContain('className="home-editorial-band');
    expect(home).not.toContain("hero-glow-orb");
    expect(home).not.toContain("float-element");
    expect(home).not.toContain("deco-svg-path");
    expect(home).not.toContain("ScrollTrigger");
    expect(home).not.toContain("animal-island-ui");
    expect(home).not.toContain("<Divider");
  });

  it("keeps the home story readable without a pinned horizontal scroll", () => {
    const story = read("src/components/FilmStripStory.tsx");

    expect(story).toContain('aria-labelledby="field-notes-title"');
    expect(story).toContain('className="field-notes-grid"');
    expect(story).toContain("ImageWithFallback");
    expect(story).not.toContain("ScrollTrigger");
    expect(story).not.toContain("gsap");
    expect(story).not.toContain("pin: true");
  });

  it("uses Lucide symbols instead of emoji in the style finder", () => {
    const quiz = read("src/components/StyleQuiz.tsx");

    expect(quiz).toContain("type LucideIcon");
    expect(quiz).toContain("icon: LucideIcon");
    expect(quiz).toContain('className="quiz-option-icon"');
    expect(quiz).not.toContain("emoji:");
    expect(quiz).not.toContain("quiz-option-emoji");
  });

  it("puts the searchable gallery before optional immersive views", () => {
    const page = read("src/pages/GalleryPage.tsx");
    const galleryIndex = page.indexOf("<Gallery />");
    const wallIndex = page.indexOf("<PhotoWall3DCss />");

    expect(page).toContain('className="gallery-page-hero"');
    expect(page).toContain('className="gallery-page-contact-sheet"');
    expect(galleryIndex).toBeGreaterThan(-1);
    expect(wallIndex).toBeGreaterThan(galleryIndex);
  });

  it("keeps photo detail image-first and presents related work as a contact sheet", () => {
    const detail = read("src/pages/PhotoDetailPage.tsx");

    expect(detail).toContain('className="photo-detail-stage"');
    expect(detail).toContain('className="photo-detail-contact-sheet"');
    expect(detail).toContain("FavoriteButton");
    expect(detail).toContain("ShareMenu");
    expect(detail).toContain("CompareSlider");
    expect(detail).toContain("RecentlyViewedStrip");
  });

  it("defines stable editorial media geometry without a gradient hero", () => {
    const heroCss = read("src/styles/hero.css");
    const galleryCss = read("src/styles/gallery.css");
    const pagesCss = read("src/styles/pages.css");

    const heroBlock = heroCss.match(/\.hero\.hero-home\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    expect(heroBlock).toContain("min-height:");
    expect(heroBlock).toContain("max-height:");
    expect(heroCss).toContain(".hero-contact-sheet");
    expect(heroCss).not.toContain("hero-glow-orb");
    expect(heroCss).not.toContain("hero-cover-design");
    expect(heroCss).not.toMatch(/\.hero\.hero-home[\s\S]*?gradient\(/s);
    expect(galleryCss).toContain(".gallery-page-contact-sheet");
    expect(pagesCss).toContain(".photo-detail-contact-sheet");
    expect(pagesCss).toMatch(/\.home-editorial-band--why \.why-card\s*\{[^}]*border-radius:\s*0/s);
    expect(pagesCss).toMatch(/\.reviews-card\s*\{[^}]*border-radius:\s*0/s);
  });
});
