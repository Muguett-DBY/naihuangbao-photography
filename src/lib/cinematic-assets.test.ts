import { describe, expect, it } from "vitest";
import {
  atmosphereGalleryItems,
  cinematicAssetManifest,
  getGalleryDisplayItems,
  isAtmosphereItem,
} from "../data/cinematic";
import type { PhotoItem } from "../types/photo";

const realPhotos: PhotoItem[] = [
  {
    id: "real-a",
    title: "真实客片 A",
    style: "jiangnan",
    location: "南京",
    imageUrl: "/images/gallery/a.webp",
    alt: "真实客片 A",
    featured: true,
    clientAuthorized: true,
    visibility: "public",
  },
  {
    id: "real-b",
    title: "真实客片 B",
    style: "street",
    location: "南京",
    imageUrl: "/images/gallery/b.webp",
    alt: "真实客片 B",
    featured: false,
    clientAuthorized: true,
    visibility: "public",
  },
];

describe("cinematic brand assets", () => {
  it("keeps brand atmosphere images separate from real client photos", () => {
    expect(atmosphereGalleryItems.length).toBeGreaterThanOrEqual(6);
    expect(atmosphereGalleryItems.length).toBeLessThanOrEqual(8);
    expect(atmosphereGalleryItems.every((item) => item.kind === "atmosphere")).toBe(true);
    expect(atmosphereGalleryItems.every((item) => item.imageUrl.startsWith("/images/cinematic/"))).toBe(true);
  });

  it("adds atmosphere cards only to the all-gallery view", () => {
    expect(getGalleryDisplayItems(realPhotos, "all").map((item) => item.id)).toEqual([
      "real-a",
      "real-b",
    ]);
    expect(getGalleryDisplayItems(realPhotos, "jiangnan").map((item) => item.id)).toEqual(["real-a"]);
  });

  it("keeps the gallery grid and lightbox limited to real photos", () => {
    const allItems = getGalleryDisplayItems(realPhotos, "all");
    const lightboxItems = allItems.filter((item): item is PhotoItem => !isAtmosphereItem(item));

    expect(lightboxItems).toEqual(realPhotos);
    expect(allItems.some(isAtmosphereItem)).toBe(false);
  });

  it("declares a luxury cinematic asset package for the light-stage scene", () => {
    expect(cinematicAssetManifest.length).toBeGreaterThanOrEqual(20);
    expect(cinematicAssetManifest.length).toBeLessThanOrEqual(28);
    expect(cinematicAssetManifest).toContain("/images/cinematic/hero-studio.webp");
    expect(cinematicAssetManifest).toContain("/images/cinematic/gallery-corridor.webp");
  });
});
