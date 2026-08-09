import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => [path, ...(path === "src/components/Gallery.tsx" ? ["src/features/gallery/GalleryCommandCenter.tsx", "src/features/gallery/GalleryResults.tsx", "src/features/gallery/gallery-discovery.ts"] : [])].map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");

describe("flagship v2 experience contracts", () => {
  it("uses native view transitions with a stable shared-photo name", () => {
    const prefetchLink = read("src/components/shared/PrefetchLink.tsx");
    const image = read("src/components/ImageWithFallback.tsx");
    const gallery = read("src/components/Gallery.tsx");
    const detail = read("src/pages/PhotoDetailPage.tsx");
    const css = read("src/styles/immersive.css");

    expect(prefetchLink).toContain("viewTransition = true");
    expect(image).toContain("transitionName?: string");
    expect(image).toContain("viewTransitionName: transitionName");
    expect(gallery).toContain("photoTransitionName(item.id)");
    expect(detail).toContain("photoTransitionName(photo.id)");
    expect(css).toContain("::view-transition-group(*)");
  });

  it("offers masonry, contact-sheet, and story gallery modes", () => {
    const gallery = read("src/components/Gallery.tsx");
    const toggle = read("src/components/GalleryViewToggle.tsx");
    const css = read("src/styles/gallery.css");

    expect(toggle).toContain('export type GalleryViewMode = "masonry" | "compact" | "contact" | "story" | "atlas"');
    expect(toggle).toContain('{ id: "story"');
    expect(gallery).toContain("<GalleryViewToggle");
    expect(gallery).toContain("gallery-masonry--story");
    expect(gallery).toContain("gallery-masonry--contact");
    expect(gallery).toContain("GalleryExhibitionAtlas");
    expect(css).toContain(".gallery-masonry--story");
  });

  it("turns the two mood choices into distinct layout systems", () => {
    const css = read("src/styles/flagship-v2.css");

    expect(css).toContain(':root[data-mood="magazine"]');
    expect(css).toContain(':root[data-mood="cute"]');
    expect(css).toContain(".mood-signature");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("adds a direct hold-to-original darkroom control", () => {
    const editor = read("src/components/editor/EditorHoldOriginalButton.tsx");
    const css = read("src/styles/flagship-v2.css");

    expect(editor).toContain("editor-hold-original");
    expect(editor).toContain("onPointerCancel");
    expect(css).toContain(".editor-hold-original");
  });

  it("keeps concept systems out of the booking-first homepage runtime", () => {
    const home = read("src/pages/HomePage.tsx");

    expect(home).not.toContain("RainLetterPremiere");
    expect(home).not.toContain("rain-letter");
    expect(home).not.toContain("VisualLightTable");
    expect(home).not.toContain("HomeVisualSystem");
    expect(home).toContain("usePublicPhotos");
    expect(home).toContain("<Packages />");
  });

  it("keeps generated concept art responsive and outside real portfolio data", () => {
    const responsiveImage = read("src/lib/responsive-image.ts");
    const conceptData = read("src/data/rain-letter.ts");
    const galleryData = read("src/data/gallery.ts");

    expect(responsiveImage).toContain('"rain-garden-lead-v6.webp"');
    expect(conceptData).toContain("rain-window-portrait-v6.webp");
    expect(galleryData).not.toContain("rain-garden-lead-v6");
  });

  it("checks for PWA releases frequently and after page restoration", () => {
    const banner = read("src/components/PwaUpdateBanner.tsx");

    expect(banner).toContain("5 * 60 * 1000");
    expect(banner).toContain('window.addEventListener("pageshow", checkForUpdate)');
  });

  it("keeps the expanded chapter rail aligned on narrow direct links", () => {
    const index = read("src/components/shared/HomeChapterIndex.tsx");

    expect(index).toContain("window.location.hash.slice(1)");
    expect(index).toContain("nav.scrollTo");
    expect(index).toContain("activeLink.offsetLeft");
  });
});
