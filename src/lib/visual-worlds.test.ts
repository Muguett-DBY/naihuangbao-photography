import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";
import { visualWorldAssets, visualWorlds } from "../data/visual-worlds";
import { getResponsivePictureAttrs } from "./responsive-picture";

function publicPath(imageUrl: string) {
  return resolve(process.cwd(), "public", imageUrl.replace(/^\//, "").replace(/\?.*$/, ""));
}

describe("Visual OS V6 worlds", () => {
  it("ships three distinct worlds backed by seven stable no-person assets", () => {
    expect(visualWorlds.map((world) => world.id)).toEqual(["dawn", "rain", "afterglow"]);
    expect(visualWorlds.every((world) => world.frames.length === 5)).toBe(true);
    expect(visualWorldAssets).toHaveLength(7);
    expect(new Set(visualWorldAssets.map((asset) => asset.assetId)).size).toBe(7);
  });

  it("ships AVIF and WebP responsive variants for every world asset", () => {
    for (const asset of visualWorldAssets) {
      const attrs = getResponsivePictureAttrs(asset.imageUrl, "100vw");
      expect(existsSync(publicPath(asset.imageUrl))).toBe(true);
      expect(attrs.sources).toHaveLength(2);
      expect(attrs.sources[0]?.srcSet).toContain("/images/visual-os-v6/640/");
      expect(attrs.sources[0]?.srcSet).toContain(".avif");
      expect(attrs.sources[1]?.srcSet).toContain("/images/visual-os-v6/960/");
      expect(attrs.sources[1]?.srcSet).toContain(".webp");
    }
  });

  it("keeps generated world imagery out of the real portfolio source", () => {
    expect(galleryItems.every((item) => !item.imageUrl.includes("visual-os-v6"))).toBe(true);
  });
});
