import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("gallery card hover polish", () => {
  it("uses a smooth opacity + transform transition for the card overlay", () => {
    const css = read("src/styles/gallery.css");
    expect(css).toContain("gallery-masonry-overlay");
    expect(css).toContain("transform: translateY(8px)");
    expect(css).toContain("transform: translateY(0)");
    expect(css).toContain("will-change: opacity, transform");
  });

  it("applies a subtle 2px lift to the card on hover", () => {
    const css = read("src/styles/gallery.css");
    expect(css).toContain("translateY(-2px)");
    expect(css).toContain(".gallery-masonry-btn:hover");
  });

  it("preserves the existing hover-trigger contract (CSS hover + is-touched for mobile)", () => {
    const css = read("src/styles/gallery.css");
    expect(css).toContain(".gallery-masonry-btn:hover .gallery-masonry-overlay");
    expect(css).toContain(".gallery-masonry-item.is-touched .gallery-masonry-overlay");
  });
});
