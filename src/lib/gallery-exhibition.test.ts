import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";
import { buildExhibitionStops, getExhibitionSeason } from "./gallery-exhibition";

describe("gallery exhibition atlas", () => {
  it("maps dated work into stable seasons", () => {
    expect(getExhibitionSeason("2026-04-12T10:00:00Z")).toBe("spring");
    expect(getExhibitionSeason("2026-07-12T10:00:00Z")).toBe("summer");
    expect(getExhibitionSeason("2026-10-12T10:00:00Z")).toBe("autumn");
    expect(getExhibitionSeason("2026-01-12T10:00:00Z")).toBe("winter");
    expect(getExhibitionSeason()).toBe("archive");
  });

  it("groups every real gallery item by location and season without loss", () => {
    const stops = buildExhibitionStops(galleryItems);
    expect(stops.length).toBeGreaterThan(0);
    expect(stops.flatMap((stop) => stop.photos).map((photo) => photo.id).sort()).toEqual(
      galleryItems.map((photo) => photo.id).sort(),
    );
  });
});
