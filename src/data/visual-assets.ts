import generatedAssets from "./visual-assets.generated.json";
import type { VisualAsset } from "../types/visual-asset";

export const visualAssets = generatedAssets as VisualAsset[];
export const visualAssetById = new Map(visualAssets.map((asset) => [asset.id, asset]));
export const visualAssetBySource = new Map(visualAssets.map((asset) => [asset.src, asset]));

export function getVisualAsset(id: string | undefined) {
  return id ? visualAssetById.get(id) : undefined;
}

export function getVisualAssetBySource(src: string | undefined) {
  return src ? visualAssetBySource.get(src.replace(/\?.*$/, "")) : undefined;
}
