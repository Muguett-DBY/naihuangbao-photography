export type VaultAssetStorage = "opfs" | "indexeddb";

export type VaultAssetAnalysis = {
  dominantColor: string;
  colorVector: [number, number, number];
  luminance: number;
  contrast: number;
  saturation: number;
  perceptualHash: string;
  qualityScore: number;
};

export type VaultAsset = {
  id: string;
  version: 1;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  storage: VaultAssetStorage;
  analysis: VaultAssetAnalysis;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type VaultImportResult = {
  asset: VaultAsset;
  duplicateOf?: VaultAsset;
};
