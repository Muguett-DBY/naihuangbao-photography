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

    expect(home).toContain('import { useGsapPageEffects } from "../hooks/useGsapPageEffects"');
    expect(home).toContain("useGsapPageEffects(rootRef)");
  });

  it("turns the home services into an image-led interactive journal", () => {
    const home = read("src/pages/HomePage.tsx");
    const services = read("src/components/ServiceJournal.tsx");
    const css = read("src/styles/pages.css");

    expect(home).toContain('import { ServiceJournal } from "../components/ServiceJournal"');
    expect(home).toContain("<ServiceJournal />");
    expect(home).not.toContain('className="home-services-grid"');
    expect(services).toContain("36vw");
    expect(css).toContain(".home-service-journal");
    expect(css).toContain(".home-service-panel.is-active");
  });

  it("presents trust promises as a keyboard-operable image desk", () => {
    const why = read("src/components/WhyChooseUs.tsx");

    expect(why).toContain('className="why-editorial-layout"');
    expect(why).toContain('className="why-editorial-media"');
    expect(why).toContain("ImageWithFallback");
    expect(why).toContain("setActiveIndex(index)");
    expect(why).toContain("onPointerEnter");
    expect(why).toContain("onFocus");
    expect(why).toContain("aria-pressed");
    expect(why).toContain("data-motion-group");
  });

  it("gives reviews motion-safe transitions, visibility pausing, and swipe navigation", () => {
    const reviews = read("src/components/Reviews.tsx");
    const css = read("src/styles/pages.css");

    expect(reviews).toContain("AnimatePresence");
    expect(reviews).toContain("useReducedMotion");
    expect(reviews).toContain('document.addEventListener("visibilitychange"');
    expect(reviews).toContain("onDragEnd");
    expect(reviews).toContain("isHovering || hasFocusWithin || isPointerActive");
    expect(reviews).toContain('window.addEventListener("pointerup", releasePointer)');
    expect(reviews).toContain('window.removeEventListener("pointerup", releasePointer)');
    expect(reviews).not.toContain("setIsPaused");
    expect(reviews).toContain('className={`reviews-progress');
    expect(css).toContain("@keyframes review-cycle");
  });

  it("pairs every style-finder step with a responsive photo preview", () => {
    const home = read("src/pages/HomePage.tsx");
    const booking = read("src/pages/BookingPage.tsx");
    const quiz = read("src/components/StyleQuiz.tsx");
    const css = read("src/styles/pages.css");

    expect(home).toContain("<StyleQuiz showPreview />");
    expect(booking).toContain("<StyleQuiz />");
    expect(booking).not.toContain("showPreview");
    expect(quiz).toContain("showPreview = false");
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

  it("closes the home page with a full-width photographic booking action", () => {
    const home = read("src/pages/HomePage.tsx");
    const css = read("src/styles/pages.css");

    expect(home).toContain('className="home-final-cta"');
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
