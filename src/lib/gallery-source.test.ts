import { describe, expect, it } from "vitest";
import { resolvePublicPhotoSource } from "./gallery-source";
import type { PhotoItem } from "../types/photo";

const staticPhotos: PhotoItem[] = [
  {
    id: "static-one",
    title: "Static",
    style: "jiangnan",
    location: "Nanjing",
    imageUrl: "/images/gallery/static.webp",
    alt: "Static photo",
    featured: true,
    clientAuthorized: true,
    visibility: "public",
  },
];

const remotePhotos: PhotoItem[] = [
  {
    id: "remote-one",
    title: "Remote",
    style: "street",
    location: "Nanjing",
    imageUrl: "/api/photos/remote-one/image",
    alt: "Remote photo",
    featured: true,
    clientAuthorized: true,
    visibility: "public",
  },
];

describe("public photo source", () => {
  it("uses remote photos as authoritative once the API has loaded", () => {
    expect(resolvePublicPhotoSource(staticPhotos, remotePhotos, true).map((p) => p.id)).toEqual([
      "remote-one",
    ]);
  });

  it("falls back to static photos only before the API has loaded successfully", () => {
    expect(resolvePublicPhotoSource(staticPhotos, [], false).map((p) => p.id)).toEqual([
      "static-one",
    ]);
  });
});
