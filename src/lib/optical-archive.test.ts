import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";
import {
  editorSampleAssets,
  getOpticalArchiveAssetsForRoute,
  opticalArchiveAssets,
} from "../data/optical-archive";
import { getResponsivePictureAttrs } from "./responsive-picture";

describe("optical archive", () => {
  it("contains only versioned no-person concept assets", () => {
    expect(opticalArchiveAssets.length).toBeGreaterThanOrEqual(12);
    expect(opticalArchiveAssets.every((asset) => asset.containsPeople === false)).toBe(true);
    expect(opticalArchiveAssets.every((asset) => asset.imageUrl.startsWith("/images/optical-archive/"))).toBe(true);
    expect(new Set(opticalArchiveAssets.map((asset) => asset.id)).size).toBe(opticalArchiveAssets.length);
  });

  it("keeps concept assets outside the real gallery source", () => {
    expect(galleryItems.some((photo) => photo.imageUrl.includes("/optical-archive/"))).toBe(false);
  });

  it("publishes responsive AVIF and WebP sources", () => {
    const asset = opticalArchiveAssets[0];
    const attrs = getResponsivePictureAttrs(asset.imageUrl, "100vw");
    expect(attrs.sources.map((source) => source.type)).toEqual(["image/avif", "image/webp"]);
    expect(attrs.sources[0]?.srcSet).toContain("/images/optical-archive/640/");
    expect(attrs.sources[0]?.srcSet).toContain(`${asset.width}w`);
  });

  it("provides route and editor subsets without duplicating assets", () => {
    expect(getOpticalArchiveAssetsForRoute("/").length).toBeGreaterThanOrEqual(4);
    expect(editorSampleAssets.length).toBeGreaterThanOrEqual(3);
    expect(new Set(editorSampleAssets.map((asset) => asset.id)).size).toBe(editorSampleAssets.length);
  });
});
