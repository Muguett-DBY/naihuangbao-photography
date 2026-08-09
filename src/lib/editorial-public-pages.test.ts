import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("booking-first public-page contracts", () => {
  it("uses authorized portfolio work and direct booking actions on the home cover", () => {
    const home = read("src/pages/HomePage.tsx");

    expect(home).toContain("usePublicPhotos");
    expect(home).toContain("photo.clientAuthorized");
    expect(home).toContain("useBookingModal");
    expect(home).toContain('className="home-booking-primary"');
    expect(home).toContain('to="/gallery"');
    expect(home).not.toContain("CinematicPremiere");
    expect(home).not.toContain("useImmersiveAnchor");
    expect(home).not.toContain("ScrollTrigger");
    expect(home).not.toContain("requestAnimationFrame");
  });

  it("keeps the homepage focused on five customer decisions", () => {
    const home = read("src/pages/HomePage.tsx");

    for (const id of ["premiere", "featured", "packages", "process", "book"]) {
      expect(home).toContain(`id: "${id}"`);
    }
    expect(home).toContain("<Packages />");
    expect(home).toContain("processSteps.map");
    expect(home).not.toContain("VisualLightTable");
    expect(home).not.toContain("HomeVisualSystem");
  });

  it("connects the customer sections to scoped reveal motion", () => {
    const home = read("src/pages/HomePage.tsx");
    expect(home).toContain('import { usePageRevealEffects } from "../hooks/usePageRevealEffects"');
    expect(home).toContain("usePageRevealEffects(rootRef)");
  });

  it("keeps homepage interactions user-controlled and reduced-motion aware", () => {
    const home = read("src/pages/HomePage.tsx");
    const css = read("src/styles/home-booking.css");

    expect(home).toContain("aria-pressed={isActive}");
    expect(home).toContain("setActiveHeroId(photo.id)");
    expect(home).not.toContain("setInterval");
    expect(home).not.toContain("SoftMagnet");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("clip-path");
  });

  it("keeps the chapter rail observer-driven without a continuous scroll listener", () => {
    const home = read("src/pages/HomePage.tsx");
    const chapterIndex = read("src/components/shared/HomeChapterIndex.tsx");
    const header = read("src/components/shared/Header.tsx");
    const css = read("src/styles/home-booking.css");

    expect(home).toContain('from "../components/shared/HomeChapterIndex"');
    expect(home).toContain("<HomeChapterIndex");
    expect(chapterIndex).toContain("IntersectionObserver");
    expect(chapterIndex).not.toContain('addEventListener("scroll"');
    expect(header).toContain("new ResizeObserver(syncNavigationHeight)");
    expect(css).toContain(".home-index-strip a.is-active");
  });

  it("keeps the photographer page tied to trust and booking", () => {
    const about = read("src/pages/AboutPage.tsx");
    const css = read("src/styles/about-booking.css");

    expect(about).toContain("sectionCopy.about");
    expect(about).toContain("whyCards.slice(0, 4)");
    expect(about).toContain("openBookingModal");
    expect(about).toContain("usePublicPhotos");
    expect(css).toContain(".about-booking-trust__list");
  });

  it("pairs every style-finder step with a responsive photo preview", () => {
    const booking = read("src/pages/BookingPage.tsx");
    const quiz = read("src/components/StyleQuiz.tsx");

    expect(booking).toContain("<StyleQuiz showPreview deferPreview />");
    expect(quiz).toContain("useReducedMotion");
    expect(quiz).toContain("usePublicPhotos");
    expect(quiz).toContain("useSiteContent");
    expect(quiz).toContain('className="quiz-preview"');
    expect(quiz).not.toContain('pkgName = "');
  });

  it("keeps searchable gallery and photo detail interactions intact", () => {
    const page = read("src/pages/GalleryPage.tsx");
    const detail = read("src/pages/PhotoDetailPage.tsx");

    expect(page).toContain("<Gallery");
    expect(detail).toContain('className="photo-detail-stage"');
    expect(detail).toContain("FavoriteButton");
    expect(detail).toContain("ShareMenu");
    expect(detail).toContain("RecentlyViewedStrip");
  });

  it("defines stable responsive media geometry for booking pages", () => {
    const homeCss = read("src/styles/home-booking.css");
    const aboutCss = read("src/styles/about-booking.css");

    expect(homeCss).toContain("aspect-ratio: 4 / 5");
    expect(homeCss).toContain("height: min(68svh, 690px)");
    expect(homeCss).toContain("scroll-snap-type: x mandatory");
    expect(aboutCss).toContain("min-height: 620px");
    expect(homeCss).not.toContain("border-radius: 22px");
  });
});
