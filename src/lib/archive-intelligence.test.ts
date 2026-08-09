import { describe, expect, it } from "vitest";
import { visualAssets } from "../data/visual-assets";
import { constellationPosition, hammingDistance, rankAssetsBySignal, searchVisualAssets, tokenizeArchiveQuery } from "./archive-intelligence";

describe("archive intelligence", () => {
  it("tokenizes CJK search text into words, characters and bigrams", () => {
    const tokens = tokenizeArchiveQuery("雨后的玻璃");
    expect(tokens).toContain("雨后的玻璃");
    expect(tokens).toContain("玻璃");
    expect(tokens).toContain("雨");
  });

  it("ranks V7 rain-glass work for a bilingual material query", () => {
    const results = searchVisualAssets("rain glass 雨 玻璃", visualAssets, 8);
    expect(results).toHaveLength(8);
    expect(results.slice(0, 4).some(({ asset }) => asset.projectIds.includes("rain-glass-observatory-v7"))).toBe(true);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it("matches a local color and luminance signal deterministically", () => {
    const reference = visualAssets.find((asset) => asset.src.includes("14-berry-glass-chamber"))!;
    const signal = { colorVector: reference.colorVector, luminance: reference.analysis.luminance };
    const first = rankAssetsBySignal(signal, visualAssets, 4);
    const second = rankAssetsBySignal(signal, visualAssets, 4);
    expect(first[0].asset.id).toBe(reference.id);
    expect(first.map(({ asset }) => asset.id)).toEqual(second.map(({ asset }) => asset.id));
  });

  it("exposes stable constellation positions and perceptual hash distance", () => {
    const position = constellationPosition(visualAssets[0], 0);
    expect(position.x).toBeGreaterThanOrEqual(0);
    expect(position.x).toBeLessThanOrEqual(1);
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.y).toBeLessThanOrEqual(1);
    expect(hammingDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });
});
