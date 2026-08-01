import { existsSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  conceptPremiereColdOpenFrames,
  conceptPremiereFeatureFrames,
  conceptPremiereFrames,
  conceptPremiereImmersiveFrames,
  conceptPremiereOpeningFrame,
  conceptPremierePortalFrames,
  conceptPremierePortalLead,
  conceptPremierePrismFrame,
  conceptPremiereTrailFrames,
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
    expect(conceptPremiereFrames).toHaveLength(9);
    expect(conceptPremiereFrames[0]?.id).toBe("opening");
    expect(conceptPremierePrismFrame.id).toBe("prism");
    expect(conceptPremiereFrames.filter((frame) => frame.kind === "portrait")).toHaveLength(6);
    expect(conceptPremiereFrames.filter((frame) => frame.kind === "detail")).toHaveLength(2);
    expect(conceptPremiereTrailFrames).toHaveLength(4);
    expect(conceptPremiereTrailFrames.filter((frame) => frame.orientation === "landscape")).toHaveLength(3);
    expect(conceptPremierePortalFrames).toHaveLength(5);
    expect(conceptPremierePortalFrames.filter((frame) => frame.orientation === "landscape")).toHaveLength(2);
    expect(conceptPremiereFeatureFrames).toHaveLength(5);
    expect(conceptPremiereFeatureFrames.filter((frame) => frame.orientation === "landscape")).toHaveLength(3);
    expect(conceptPremiereColdOpenFrames).toHaveLength(5);
    expect(new Set(conceptPremiereColdOpenFrames.map((frame) => frame.imageUrl)).size).toBe(5);
    expect(conceptPremiereImmersiveFrames).toHaveLength(7);

    const currentConceptUrls = [
      ...conceptPremierePortalFrames,
      ...conceptPremiereFeatureFrames,
    ].map((frame) => frame.imageUrl);
    expect(new Set(currentConceptUrls).size).toBe(10);

    for (const frame of [
      ...conceptPremiereFrames,
      ...conceptPremiereTrailFrames,
      ...conceptPremierePortalFrames,
      ...conceptPremiereFeatureFrames,
    ]) {
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
    const trailPicture = getResponsivePictureAttrs(conceptPremiereTrailFrames[0].imageUrl, "20vw");
    const portalPicture = getResponsivePictureAttrs(conceptPremierePortalLead.imageUrl, "100vw");

    expect(picture.sources).toHaveLength(2);
    expect(picture.sources[0]?.srcSet).toContain("/images/concept-premiere/640/");
    expect(picture.sources[0]?.srcSet).toContain(".avif");
    expect(picture.sources[0]?.srcSet).toContain("1672w");
    expect(picture.sources[1]?.srcSet).toContain(".webp");
    expect(trailPicture.sources[0]?.srcSet).toContain("/images/concept-premiere/640/premiere-veil-v5.avif");
    expect(trailPicture.sources[0]?.srcSet).toContain("1024w");
    expect(portalPicture.sources[0]?.srcSet).toContain("/images/concept-premiere/640/premiere-luminance-v4.avif");
    expect(portalPicture.sources[0]?.srcSet).toContain("1600w");
    expect(image.srcSet).toContain("/images/concept-premiere/960/");
    expect(galleryItems.every((item) => !item.imageUrl.includes("concept-premiere"))).toBe(true);
  });

  it("describes every current concept source at its real encoded width", async () => {
    for (const frame of [...conceptPremierePortalFrames, ...conceptPremiereFeatureFrames]) {
      const imagePath = assetPath(frame.imageUrl);
      const metadata = await sharp(resolve(root, "public", imagePath)).metadata();
      const picture = getResponsivePictureAttrs(frame.imageUrl, "100vw");
      expect(metadata.width).toBeGreaterThan(960);
      expect(picture.sources[0]?.srcSet).toContain(`${metadata.width}w`);
      expect(picture.sources[1]?.srcSet).toContain(`${metadata.width}w`);
    }
  });
});
