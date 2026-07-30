import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  conceptPremiereFrames,
  conceptPremiereOpeningFrame,
} from "../data/concept-premiere";
import { galleryItems } from "../data/gallery";
import { getResponsiveImageAttrs } from "./responsive-image";
import { getResponsivePictureAttrs } from "./responsive-picture";

const root = process.cwd();

function assetPath(imageUrl: string) {
  return imageUrl.replace(/^\//, "").replace(/\?.*$/, "");
}

describe("homepage concept premiere assets", () => {
  it("ships the expected concept-only film sequence with responsive variants", () => {
    expect(conceptPremiereFrames).toHaveLength(6);
    expect(conceptPremiereFrames[0]?.id).toBe("opening");
    expect(conceptPremiereFrames.filter((frame) => frame.kind === "portrait")).toHaveLength(4);
    expect(conceptPremiereFrames.filter((frame) => frame.kind === "detail")).toHaveLength(1);

    for (const frame of conceptPremiereFrames) {
      const imagePath = assetPath(frame.imageUrl);
      const fileName = imagePath.split("/").at(-1);
      const avifName = fileName?.replace(/\.webp$/, ".avif");
      expect(existsSync(resolve(root, "public", imagePath))).toBe(true);
      expect(existsSync(resolve(root, "public", "images/concept-premiere/640", fileName ?? ""))).toBe(true);
      expect(existsSync(resolve(root, "public", "images/concept-premiere/960", fileName ?? ""))).toBe(true);
      expect(existsSync(resolve(root, "public", "images/concept-premiere", avifName ?? ""))).toBe(true);
      expect(existsSync(resolve(root, "public", "images/concept-premiere/640", avifName ?? ""))).toBe(true);
      expect(existsSync(resolve(root, "public", "images/concept-premiere/960", avifName ?? ""))).toBe(true);
    }
  });

  it("emits AVIF and WebP source sets for concept visuals without contaminating the real gallery", () => {
    const picture = getResponsivePictureAttrs(conceptPremiereOpeningFrame.imageUrl, "100vw");
    const image = getResponsiveImageAttrs(conceptPremiereOpeningFrame.imageUrl, "100vw");

    expect(picture.sources).toHaveLength(2);
    expect(picture.sources[0]?.srcSet).toContain("/images/concept-premiere/640/");
    expect(picture.sources[0]?.srcSet).toContain(".avif");
    expect(picture.sources[1]?.srcSet).toContain(".webp");
    expect(image.srcSet).toContain("/images/concept-premiere/960/");
    expect(galleryItems.every((item) => !item.imageUrl.includes("concept-premiere"))).toBe(true);
  });
});
