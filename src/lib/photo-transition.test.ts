import { describe, expect, it } from "vitest";
import { photoTransitionName } from "./photo-transition";

describe("photoTransitionName", () => {
  it("creates stable CSS identifiers from photo ids", () => {
    expect(photoTransitionName("Gallery Daily 01")).toBe("nhb-photo-gallery-daily-01");
    expect(photoTransitionName("NHB/雨-02")).toBe("nhb-photo-nhb--02");
  });
});
