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
  {
    id: "static-two",
    title: "Static Two",
    style: "park",
    location: "Nanjing",
    imageUrl: "/images/gallery/static-two.webp",
    alt: "Static second photo",
    featured: false,
    clientAuthorized: true,
    visibility: "public",
  },
];

const remotePhotos: PhotoItem[] = [
  {
    id: "static-two",
    title: "Remote Two",
    style: "park",
    location: "Nanjing",
    imageUrl: "/api/photos/static-two/image",
    alt: "Remote second photo",
    featured: false,
    clientAuthorized: true,
    visibility: "public",
  },
  {
    id: "static-one",
    title: "Remote One",
    style: "street",
    location: "Nanjing",
    imageUrl: "/api/photos/static-one/image",
    alt: "Remote first photo",
    featured: true,
    clientAuthorized: true,
    visibility: "public",
  },
  {
    id: "remote-extra",
    title: "Remote Extra",
    style: "street",
    location: "Nanjing",
    imageUrl: "/api/photos/remote-extra/image",
    alt: "Remote extra photo",
    featured: false,
    clientAuthorized: true,
    visibility: "public",
  },
];

describe("public photo source", () => {
  it("uses remote photo content without reordering known static photos", () => {
    expect(resolvePublicPhotoSource(staticPhotos, remotePhotos, true).map((p) => p.id)).toEqual([
      "static-one",
      "static-two",
      "remote-extra",
    ]);
    expect(resolvePublicPhotoSource(staticPhotos, remotePhotos, true)[0]?.title).toBe("Remote One");
  });

  it("falls back to static photos only before the API has loaded successfully", () => {
    expect(resolvePublicPhotoSource(staticPhotos, [], false).map((p) => p.id)).toEqual([
      "static-one",
      "static-two",
    ]);
  });

  it("keeps static photos when a loaded remote response is empty", () => {
    expect(resolvePublicPhotoSource(staticPhotos, [], true).map((p) => p.id)).toEqual([
      "static-one",
      "static-two",
    ]);
  });
});
