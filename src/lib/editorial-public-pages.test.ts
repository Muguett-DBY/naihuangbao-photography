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
    expect(home).toContain("<HomeVisualSystem />");
    expect(home).toContain('className="home-playground-portals"');
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
    expect(story).toContain('className="field-notes-stage"');
    expect(story).toContain('className="field-notes-rail"');
    expect(story).toContain('className="field-notes-grid"');
    expect(story).toContain("setActiveIndex(index)");
    expect(story).toContain("onPointerEnter");
    expect(story).toContain("onFocus");
    expect(story).toContain("field-note is-active");
    expect(story).toContain("data-motion-group");
    expect(story).toContain("data-motion-item");
    expect(story).toContain("ImageWithFallback");
    expect(story).toContain("index === 0 || index === 4");
    expect(story).toContain("66vw");
    expect(story).not.toContain("ScrollTrigger");
    expect(story).not.toContain("gsap");
    expect(story).not.toContain("pin: true");
  });

  it("connects the home editorial sections to scoped reveal motion", () => {
    const home = read("src/pages/HomePage.tsx");

    expect(home).toContain('import { usePageRevealEffects } from "../hooks/usePageRevealEffects"');
    expect(home).toContain("usePageRevealEffects(rootRef)");
  });

  it("keeps the soft CTA magnet off the React render path and honors reduced motion", () => {
    const home = read("src/pages/HomePage.tsx");
    const magnet = read("src/components/shared/SoftMagnet.tsx");
    const css = read("src/styles/home-premiere.css");

    expect(home).toContain("<SoftMagnet");
    expect(magnet).toContain("window.requestAnimationFrame");
    expect(magnet).toContain("prefers-reduced-motion: reduce");
    expect(magnet).not.toContain("useState");
    expect(css).toContain("--soft-magnet-x");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.soft-magnet\s*\{[^}]*transform:\s*none !important/s);
  });

  it("keeps a desktop chapter console in sync without a continuous scroll listener", () => {
    const home = read("src/pages/HomePage.tsx");
    const chapterIndex = read("src/components/shared/HomeChapterIndex.tsx");
    const header = read("src/components/shared/Header.tsx");
    const css = read("src/styles/platform-v5.css");
    const premiereCss = read("src/styles/home-premiere.css");

    expect(home).toContain('from "../components/shared/HomeChapterIndex"');
    expect(home).toContain("<HomeChapterIndex");
    expect(home).toContain('id="make-something"');
    expect(chapterIndex).toContain("IntersectionObserver");
    expect(chapterIndex).toContain('const DESKTOP_INDEX_QUERY = "(min-width: 981px)"');
    expect(chapterIndex).toContain("matchMedia(DESKTOP_INDEX_QUERY)");
    expect(chapterIndex).toContain('aria-current={isActive ? "location" : undefined}');
    expect(chapterIndex).not.toContain('addEventListener("scroll"');
    expect(header).toContain("new ResizeObserver(syncNavigationHeight)");
    expect(header).toContain('style.setProperty("--nav-h"');
    expect(css).toMatch(/@media \(min-width: 981px\)[\s\S]*?\.home-index-strip\s*\{[^}]*position:\s*sticky[^}]*top:\s*var\(--nav-h,\s*64px\)/s);
    expect(css).toContain(".home-index-strip a.is-active");
    expect(premiereCss).toContain("scroll-margin-top: calc(var(--nav-h, 64px) + 74px)");
  });

  it("adds a desktop-only optical focus response to gallery photographs", () => {
    const css = read("src/styles/gallery.css");

    expect(css).toMatch(/@media \(min-width: 981px\) and \(hover: hover\) and \(pointer: fine\)/);
    expect(css).toContain(".gallery-masonry-media::after");
    expect(css).toContain(".gallery-masonry-item:hover .gallery-masonry-media::after");
    expect(css).toContain(".gallery-masonry-item:focus-within .gallery-masonry-media::after");
  });

  it("turns the home platform map into an image-led interactive visual system", () => {
    const home = read("src/pages/HomePage.tsx");
    const system = read("src/components/HomeVisualSystem.tsx");
    const css = read("src/styles/platform-v5.css");

    expect(home).toContain('import { HomeVisualSystem } from "../components/HomeVisualSystem"');
    expect(home).toContain("<HomeVisualSystem />");
    expect(system).toContain("requestAnimationFrame");
    expect(system).toContain("aria-pressed");
    expect(system).toContain('role="group"');
    expect(system).toContain('aria-label="NHB system areas"');
    expect(css).toContain(".home-visual-system__stage");
    expect(css).toContain(".home-visual-system__nodes button:is(:hover, :focus-visible, .is-active)");
  });

  it("pairs every style-finder step with a responsive photo preview", () => {
    const home = read("src/pages/HomePage.tsx");
    const booking = read("src/pages/BookingPage.tsx");
    const quiz = read("src/components/StyleQuiz.tsx");
    const css = read("src/styles/pages.css");

    expect(home).not.toContain("<StyleQuiz");
    expect(booking).toContain("<StyleQuiz showPreview deferPreview />");
    expect(quiz).toContain("showPreview = false");
    expect(quiz).toContain("deferPreview = false");
    expect(quiz).toContain("useInView");
    expect(quiz).toContain("AnimatePresence");
    expect(quiz).toContain("useReducedMotion");
    expect(quiz).toContain("usePublicPhotos");
    expect(quiz).toContain("ImageWithFallback");
    expect(quiz).toContain('className="quiz-preview"');
    expect(quiz).toContain('className="quiz-workbench"');
    expect(css).toContain(".quiz-preview");
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.home-editorial-band--quiz \.quiz-workbench\s*\{[^}]*order:\s*1/s);
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.quiz-preview\s*\{[^}]*order:\s*2/s);
  });

  it("closes the home page with a full-width photographic creation action", () => {
    const home = read("src/pages/HomePage.tsx");
    const css = read("src/styles/platform-v5.css");

    expect(home).toContain('className="home-final-cta home-final-cta--create"');
    expect(home).toContain('className="home-final-cta-media"');
    expect(home).toContain('className="home-final-cta-content"');
    expect(home).toContain("data-motion-group");
    expect(home).not.toContain('className="home-editorial-band home-final-cta"');
    expect(css).toContain(".home-final-cta-media");
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
    const galleryIndex = page.indexOf("<Gallery");
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

  it("defines stable editorial media geometry without a gradient hero background", () => {
    const heroCss = read("src/styles/hero.css");
    const premiereCss = read("src/styles/home-premiere.css");
    const galleryCss = read("src/styles/gallery.css");
    const pagesCss = read("src/styles/pages.css");

    const heroBlock = heroCss.match(/\.hero\.hero-home\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    expect(heroBlock).toContain("min-height:");
    expect(heroBlock).toContain("max-height:");
    expect(heroCss).toContain(".hero-contact-sheet");
    expect(heroCss).not.toContain("hero-glow-orb");
    expect(heroCss).not.toContain("hero-cover-design");
    expect(heroBlock).not.toMatch(/background(?:-image)?\s*:[^;]*gradient\(/s);
    expect(premiereCss).toMatch(/\.cinematic-premiere__stage\s*\{[^}]*clip-path:\s*inset\(/s);
    expect(premiereCss).toMatch(/\.cinematic-premiere__reel button\s*\{[^}]*min-height:\s*48px/s);
    expect(premiereCss).toContain("content-visibility: auto");
    expect(galleryCss).toContain(".gallery-page-contact-sheet");
    expect(pagesCss).toContain(".photo-detail-contact-sheet");
    expect(pagesCss).toMatch(/\.home-editorial-band--why \.why-card\s*\{[^}]*border-radius:\s*0/s);
    expect(pagesCss).toMatch(/\.reviews-card\s*\{[^}]*border-radius:\s*0/s);
  });
});
