import { describe, expect, it } from "vitest";
import { MAX_CINEMATIC_PHOTOS, selectCinematicPhotos } from "./cinematic-gallery";
import type { PhotoItem } from "../types/photo";

function makePhoto(id: string, overrides: Partial<PhotoItem> = {}): PhotoItem {
  return {
    id,
    title: id,
    style: "jiangnan",
    location: "南京",
    imageUrl: `/images/gallery/${id}.webp`,
    alt: id,
    featured: false,
    clientAuthorized: true,
    visibility: "public",
    ...overrides,
  };
}

describe("cinematic gallery source", () => {
  it("caps the WebGL texture list at 24 public photos", () => {
    const photos = Array.from({ length: 30 }, (_, index) => makePhoto(`photo-${index}`));

    expect(MAX_CINEMATIC_PHOTOS).toBe(24);
    expect(selectCinematicPhotos(photos)).toHaveLength(24);
  });

  it("keeps featured public photos first while preserving source order inside each group", () => {
    const photos = [
      makePhoto("plain-a"),
      makePhoto("featured-a", { featured: true }),
      makePhoto("hidden-featured", { featured: true, visibility: "hidden" }),
      makePhoto("featured-b", { featured: true }),
      makePhoto("unauthorized", { clientAuthorized: false }),
      makePhoto("plain-b"),
    ];

    expect(selectCinematicPhotos(photos).map((photo) => photo.id)).toEqual([
      "featured-a",
      "featured-b",
      "plain-a",
      "plain-b",
    ]);
  });

  it("excludes photos that cannot become WebGL textures", () => {
    const photos = [
      makePhoto("empty-image", { imageUrl: "" }),
      makePhoto("visible"),
    ];

    expect(selectCinematicPhotos(photos).map((photo) => photo.id)).toEqual(["visible"]);
  });
});
