import { describe, expect, it } from "vitest";
import {
  extractPhotoMetadata,
  searchPhotosByTag,
  updatePhotoMetadataWithDimensions,
} from "./photo-metadata";

describe("photo metadata utilities", () => {
  it("infers category from filename keywords", () => {
    const metadata = extractPhotoMetadata({ name: "jiangnan-2024-03-15.webp", size: 1024, type: "image/webp" });
    expect(metadata.category).toBe("jiangnan");
    expect(metadata.capturedAt).toBe("2024-03-15");
  });

  it("returns uncategorized for unknown keywords", () => {
    const metadata = extractPhotoMetadata({ name: "random-photo.webp" });
    expect(metadata.category).toBe("uncategorized");
  });

  it("extracts tags from filename parts", () => {
    const metadata = extractPhotoMetadata({ name: "couple-sunset-beach-2024.webp" });
    expect(metadata.tags).toContain("couple");
    expect(metadata.tags).toContain("sunset");
    expect(metadata.tags).toContain("beach");
  });

  it("parses capture date from filename", () => {
    const metadata = extractPhotoMetadata({ name: "photo_2024-03-15.jpg" });
    expect(metadata.capturedAt).toBe("2024-03-15");
  });

  it("updates metadata with image dimensions and aspect ratio", () => {
    const base = extractPhotoMetadata({ name: "test.webp" });
    const updated = updatePhotoMetadataWithDimensions(base, 1920, 1080);
    expect(updated.width).toBe(1920);
    expect(updated.height).toBe(1080);
    expect(updated.aspectRatio).toBe("16:9");
  });

  it("searches photos by title, location, style, or tag", () => {
    const photos = [
      { id: "1", title: "Sunset Beach", tags: ["sunset", "beach"] },
      { id: "2", title: "City Night", tags: ["urban"] },
      { id: "3", title: "Forest Walk", tags: ["nature", "forest"] },
    ];
    expect(searchPhotosByTag(photos, "sunset").map((p) => p.id)).toEqual(["1"]);
    expect(searchPhotosByTag(photos, "forest").map((p) => p.id)).toEqual(["3"]);
    expect(searchPhotosByTag(photos, "").length).toBe(3);
  });
});
