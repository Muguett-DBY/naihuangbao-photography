import type { VisualAsset } from "../types/visual-asset";

export type ArchiveDiscoveryMode = "hybrid" | "color" | "material";

export type RankedVisualAsset = {
  asset: VisualAsset;
  score: number;
  colorSimilarity: number;
  materialSimilarity: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function descriptorSet(asset: VisualAsset) {
  return new Set([...asset.palette, ...asset.descriptors].map((value) => value.trim().toLocaleLowerCase("zh-CN")));
}

export function calculateColorSimilarity(left: VisualAsset, right: VisualAsset) {
  const distance = Math.sqrt(left.colorVector.reduce((sum, channel, index) => {
    const delta = channel - right.colorVector[index];
    return sum + delta * delta;
  }, 0));
  return clamp(1 - distance / Math.sqrt(3 * 255 * 255));
}

export function calculateMaterialSimilarity(left: VisualAsset, right: VisualAsset) {
  const leftSet = descriptorSet(left);
  const rightSet = descriptorSet(right);
  const intersection = [...leftSet].filter((value) => rightSet.has(value)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

export function rankSimilarAssets(
  reference: VisualAsset,
  candidates: readonly VisualAsset[],
  mode: ArchiveDiscoveryMode = "hybrid",
  limit = 6,
): RankedVisualAsset[] {
  return candidates
    .filter((candidate) => candidate.id !== reference.id)
    .map((asset) => {
      const colorSimilarity = calculateColorSimilarity(reference, asset);
      const materialSimilarity = calculateMaterialSimilarity(reference, asset);
      const orientationAffinity = reference.orientation === asset.orientation ? 1 : 0.35;
      const score = mode === "color"
        ? colorSimilarity * 0.9 + orientationAffinity * 0.1
        : mode === "material"
          ? materialSimilarity * 0.9 + orientationAffinity * 0.1
          : colorSimilarity * 0.5 + materialSimilarity * 0.4 + orientationAffinity * 0.1;
      return { asset, score, colorSimilarity, materialSimilarity };
    })
    .sort((left, right) => right.score - left.score || left.asset.id.localeCompare(right.asset.id, "en"))
    .slice(0, Math.max(0, limit));
}

export function parseArchiveAssetIds(value: string | null | undefined, validIds: ReadonlySet<string>, limit = 24) {
  if (!value) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter((id) => validIds.has(id)))].slice(0, limit);
}

export function createArchiveExhibitionQuery(assetIds: readonly string[]) {
  const params = new URLSearchParams();
  const uniqueIds = [...new Set(assetIds)].slice(0, 24);
  if (uniqueIds.length) params.set("exhibition", uniqueIds.join(","));
  return params.toString();
}
