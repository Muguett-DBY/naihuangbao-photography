import { describe, expect, it } from "vitest";
import {
  countFacets,
  DEFAULT_FACETS,
  facetedSearch,
  filterByDateRange,
  getAlbums,
  getPhotosByStyle,
  getPublicPhotos,
} from "./gallery";
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
    album: "雨季",
    createdAt: "2026-05-10T00:00:00Z",
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
  {
    id: "older-public",
    title: "往期作品",
    style: "park",
    location: "南京",
    imageUrl: "/images/gallery/d.jpg",
    alt: "往期",
    featured: false,
    clientAuthorized: true,
    visibility: "public",
    album: "晨光",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

describe("gallery policy", () => {
  it("only exposes photos that are client-authorized and public", () => {
    expect(getPublicPhotos(photos).map((photo) => photo.id)).toEqual([
      "authorized-public",
      "older-public",
    ]);
  });

  it("filters public photos by style", () => {
    expect(
      getPhotosByStyle(photos, "jiangnan").map((photo) => photo.id),
    ).toEqual(["authorized-public"]);
  });
});

describe("faceted search", () => {
  it("returns the unique sorted album list of public photos", () => {
    expect(getAlbums(photos)).toEqual(["晨光", "雨季"]);
  });

  it("counts facets across all public photos", () => {
    const counts = countFacets(photos);
    expect(counts.style.all).toBe(2);
    expect(counts.album["雨季"]).toBe(1);
    expect(counts.dateRange.older).toBe(1);
  });

  it("filters by date range older than a year", () => {
    const result = filterByDateRange(getPublicPhotos(photos), "older");
    expect(result.map((p) => p.id)).toEqual(["older-public"]);
  });

  it("filters by date range within last 365 days", () => {
    const result = filterByDateRange(getPublicPhotos(photos), "last-365");
    expect(result.map((p) => p.id)).toEqual(["authorized-public"]);
  });

  it("applies combined style + album + search facets", () => {
    const result = facetedSearch(photos, {
      ...DEFAULT_FACETS,
      style: "jiangnan",
      album: "雨季",
      search: "南京",
    });
    expect(result.map((p) => p.id)).toEqual(["authorized-public"]);
  });

  it("returns empty array when no photo matches all facets", () => {
    const result = facetedSearch(photos, {
      ...DEFAULT_FACETS,
      style: "couple",
    });
    expect(result).toEqual([]);
  });
});

