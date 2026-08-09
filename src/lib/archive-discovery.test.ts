import { describe, expect, it } from "vitest";
import { visualAssets } from "../data/visual-assets";
import {
  calculateColorSimilarity,
  createArchiveExhibitionQuery,
  parseArchiveAssetIds,
  rankSimilarAssets,
} from "./archive-discovery";

describe("archive visual neighborhood", () => {
  it("ranks deterministic neighbors without returning the reference", () => {
    const reference = visualAssets.find((asset) => asset.src.includes("01-cream-pavilion"))!;
    const first = rankSimilarAssets(reference, visualAssets, "hybrid", 6);
    const second = rankSimilarAssets(reference, visualAssets, "hybrid", 6);

    expect(first).toHaveLength(6);
    expect(first.every(({ asset }) => asset.id !== reference.id)).toBe(true);
    expect(first.map(({ asset }) => asset.id)).toEqual(second.map(({ asset }) => asset.id));
    expect(first.every(({ score }) => score >= 0 && score <= 1)).toBe(true);
  });

  it("treats identical color vectors as exact color matches", () => {
    const reference = visualAssets[0]!;
    expect(calculateColorSimilarity(reference, { ...visualAssets[1]!, colorVector: reference.colorVector })).toBe(1);
  });

  it("parses bounded, valid and duplicate-free exhibition links", () => {
    const validIds = new Set(visualAssets.slice(0, 3).map((asset) => asset.id));
    const firstId = visualAssets[0]!.id;
    const secondId = visualAssets[1]!.id;
    expect(parseArchiveAssetIds(`${firstId},missing,${secondId},${firstId}`, validIds)).toEqual([firstId, secondId]);
    expect(createArchiveExhibitionQuery([firstId, secondId, firstId])).toBe(`exhibition=${encodeURIComponent(`${firstId},${secondId}`)}`);
  });
});
