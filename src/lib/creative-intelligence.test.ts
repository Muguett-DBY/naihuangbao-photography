import { describe, expect, it } from "vitest";
import { visualAssets } from "../data/visual-assets";
import { hammingDistance } from "./archive-intelligence";
import { CURATOR_PRESETS, curateVisualSequence } from "./creative-intelligence";

describe("creative intelligence", () => {
  it("builds deterministic explainable sequences at every supported length", () => {
    for (const count of [6, 12, 24] as const) {
      const first = curateVisualSequence("cream glass botanical rhythm", visualAssets, count, "morning");
      const second = curateVisualSequence("cream glass botanical rhythm", visualAssets, count, "morning");
      expect(first.frames).toHaveLength(count);
      expect(first.frames.map(({ asset }) => asset.id)).toEqual(second.frames.map(({ asset }) => asset.id));
      expect(first.frames.every(({ reason, score }) => reason.length > 0 && score >= 0 && score <= 100)).toBe(true);
      expect(first.frames[0].role).toBe("opening");
      expect(first.frames.at(-1)?.role).toBe("closing");
    }
  });

  it("avoids adjacent perceptual near-duplicates and responds to mood direction", () => {
    const morning = curateVisualSequence("soft paper", visualAssets, 12, "morning");
    const night = curateVisualSequence("shadow projection", visualAssets, 12, "nocturne");
    for (let index = 1; index < morning.frames.length; index += 1) {
      expect(hammingDistance(morning.frames[index - 1].asset.analysis.perceptualHash, morning.frames[index].asset.analysis.perceptualHash)).toBeGreaterThanOrEqual(5);
    }
    expect(morning.frames.map(({ asset }) => asset.id)).not.toEqual(night.frames.map(({ asset }) => asset.id));
    expect(Object.keys(CURATOR_PRESETS)).toEqual(["morning", "botanical", "coral", "nocturne"]);
  });
});
