import { existsSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";
import { rainLetterFrames } from "../data/rain-letter";
import { getResponsivePictureAttrs } from "./responsive-picture";

const root = process.cwd();
const cleanPath = (imageUrl: string) => imageUrl.replace(/^\//, "").replace(/\?.*$/, "");

describe("seasonal rain letter assets", () => {
  it("ships three concept-only frames with complete responsive formats", async () => {
    expect(rainLetterFrames.map((frame) => frame.id)).toEqual(["garden", "window", "lane"]);

    for (const frame of rainLetterFrames) {
      const imagePath = cleanPath(frame.imageUrl);
      const fileName = imagePath.split("/").at(-1) ?? "";
      const avifName = fileName.replace(/\.webp$/, ".avif");

      for (const variant of [
        imagePath,
        `images/concept-premiere/${avifName}`,
        `images/concept-premiere/640/${fileName}`,
        `images/concept-premiere/640/${avifName}`,
        `images/concept-premiere/960/${fileName}`,
        `images/concept-premiere/960/${avifName}`,
      ]) {
        expect(existsSync(resolve(root, "public", variant))).toBe(true);
      }

      const metadata = await sharp(resolve(root, "public", imagePath)).metadata();
      const picture = getResponsivePictureAttrs(frame.imageUrl, "100vw");
      expect(metadata.width).toBeGreaterThan(960);
      expect(picture.sources[0]?.srcSet).toContain(`${metadata.width}w`);
      expect(picture.sources[1]?.srcSet).toContain(`${metadata.width}w`);
    }
  });

  it("never mixes seasonal concept frames into the real gallery", () => {
    const conceptUrls = new Set(rainLetterFrames.map((frame) => cleanPath(frame.imageUrl)));
    expect(galleryItems.every((item) => !conceptUrls.has(cleanPath(item.imageUrl)))).toBe(true);
  });
});
