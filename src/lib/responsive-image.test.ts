import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";
import { getResponsiveImageDimensions } from "./responsive-image";

describe("responsive image dimensions", () => {
  it("describes real gallery portraits with their encoded 3:4 ratio", async () => {
    expect(getResponsiveImageDimensions(galleryItems[0].imageUrl)).toEqual({ width: 1200, height: 1600 });

    for (const photo of galleryItems) {
      const relativePath = photo.imageUrl.replace(/^\//, "").replace(/\?.*$/, "");
      const metadata = await sharp(resolve(process.cwd(), "public", relativePath)).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBeGreaterThanOrEqual(1599);
      expect(metadata.height).toBeLessThanOrEqual(1601);
    }
  });

  it("keeps a stable fallback ratio for generated and remote sources", () => {
    expect(getResponsiveImageDimensions("/images/concept-premiere/premiere-opening-v1.webp"))
      .toEqual({ width: 960, height: 1200 });
    expect(getResponsiveImageDimensions("https://example.com/portrait.webp"))
      .toEqual({ width: 960, height: 1200 });
  });
});
