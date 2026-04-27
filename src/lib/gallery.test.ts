import { describe, expect, it } from "vitest";
import { getFeaturedPhotos, getPhotosByStyle, getPublicPhotos } from "./gallery";
import type { PhotoItem } from "../types/photo";

const photos: PhotoItem[] = [
  {
    id: "authorized-public",
    title: "授权公开",
    style: "jiangnan",
    location: "南京",
    imageUrl: "/images/gallery/a.jpg",
    alt: "授权公开作品",
    featured: true,
    clientAuthorized: true,
    visibility: "public",
  },
  {
    id: "not-authorized",
    title: "未授权",
    style: "street",
    location: "南京",
    imageUrl: "/images/gallery/b.jpg",
    alt: "未授权作品",
    featured: true,
    clientAuthorized: false,
    visibility: "public",
  },
  {
    id: "hidden",
    title: "隐藏作品",
    style: "jiangnan",
    location: "南京",
    imageUrl: "/images/gallery/c.jpg",
    alt: "隐藏作品",
    featured: true,
    clientAuthorized: true,
    visibility: "hidden",
  },
];

describe("gallery policy", () => {
  it("only exposes photos that are client-authorized and public", () => {
    expect(getPublicPhotos(photos).map((photo) => photo.id)).toEqual([
      "authorized-public",
    ]);
  });

  it("never includes unauthorized or hidden photos in featured work", () => {
    expect(getFeaturedPhotos(photos).map((photo) => photo.id)).toEqual([
      "authorized-public",
    ]);
  });

  it("filters public photos by style", () => {
    expect(getPhotosByStyle(photos, "jiangnan").map((photo) => photo.id)).toEqual([
      "authorized-public",
    ]);
  });
});
