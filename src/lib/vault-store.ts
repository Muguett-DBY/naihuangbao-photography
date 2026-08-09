import type { WorkspaceAssetReference } from "../types/workspace-project";
import type { VaultAsset, VaultAssetStorage, VaultImportResult } from "../types/vault-asset";
import { analyzeVaultImage, deriveVaultTags, vaultHashDistance } from "./vault-analysis";
import { runLocalStudioRequest } from "./local-studio-db";

type StorageManagerWithDirectory = StorageManager & {
  getDirectory?: () => Promise<FileSystemDirectoryHandle>;
};

type VaultBlobRecord = { id: string; blob: Blob };

export function createVaultAssetId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `vault-${crypto.randomUUID()}`
    : `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function vaultAssetSrc(id: string) {
  return `vault://${id}`;
}

export function vaultAssetIdFromSrc(src: string) {
  return src.startsWith("vault://") ? src.slice("vault://".length) : null;
}

async function vaultDirectory(create = false) {
  const storage = navigator.storage as StorageManagerWithDirectory;
  if (!storage?.getDirectory) return null;
  const root = await storage.getDirectory();
  return root.getDirectoryHandle("nhb-asset-vault", { create });
}

async function writeVaultBlob(id: string, blob: Blob): Promise<VaultAssetStorage> {
  try {
    const directory = await vaultDirectory(true);
    if (directory) {
      const handle = await directory.getFileHandle(`${id}.asset`, { create: true });
      const writer = await handle.createWritable();
      await writer.write(blob);
      await writer.close();
      return "opfs";
    }
  } catch {
    // IndexedDB is the portable fallback when OPFS is unavailable or blocked.
  }
  await runLocalStudioRequest("vaultBlobs", "readwrite", (store) => store.put({ id, blob } satisfies VaultBlobRecord));
  return "indexeddb";
}

export async function readVaultBlob(asset: Pick<VaultAsset, "id" | "storage">) {
  if (asset.storage === "opfs") {
    try {
      const directory = await vaultDirectory();
      const handle = await directory?.getFileHandle(`${asset.id}.asset`);
      if (handle) return await handle.getFile();
    } catch {
      return null;
    }
  }
  const record = await runLocalStudioRequest<VaultBlobRecord | undefined>("vaultBlobs", "readonly", (store) => store.get(asset.id));
  return record?.blob ?? null;
}

export async function listVaultAssets() {
  if (!("indexedDB" in window)) return [];
  const assets = await runLocalStudioRequest<VaultAsset[]>("vaultAssets", "readonly", (store) => store.getAll());
  return assets.filter((asset) => asset?.version === 1).sort((left, right) => right.createdAt - left.createdAt);
}

export async function getVaultAsset(id: string) {
  if (!("indexedDB" in window)) return null;
  const asset = await runLocalStudioRequest<VaultAsset | undefined>("vaultAssets", "readonly", (store) => store.get(id));
  return asset?.version === 1 ? asset : null;
}

export async function importVaultFile(file: File, existing?: readonly VaultAsset[]): Promise<VaultImportResult> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  if (file.size > 40 * 1024 * 1024) throw new Error(`${file.name} exceeds the 40 MB local import limit`);
  const { analysis, width, height } = await analyzeVaultImage(file);
  const assets = existing ?? await listVaultAssets();
  const duplicateOf = assets.find((asset) => vaultHashDistance(asset.analysis.perceptualHash, analysis.perceptualHash) <= 3);
  if (duplicateOf) return { asset: duplicateOf, duplicateOf };

  const id = createVaultAssetId();
  const now = Date.now();
  const storage = await writeVaultBlob(id, file);
  const asset: VaultAsset = {
    id,
    version: 1,
    name: file.name.replace(/\.[^.]+$/, ""),
    type: file.type,
    size: file.size,
    width,
    height,
    storage,
    analysis,
    tags: deriveVaultTags(file.name, analysis),
    createdAt: now,
    updatedAt: now,
  };
  await runLocalStudioRequest("vaultAssets", "readwrite", (store) => store.put(asset));
  return { asset };
}

export async function updateVaultAsset(asset: VaultAsset) {
  await runLocalStudioRequest("vaultAssets", "readwrite", (store) => store.put({ ...asset, updatedAt: Date.now() }));
}

export async function deleteVaultAsset(asset: VaultAsset) {
  if (asset.storage === "opfs") {
    try {
      const directory = await vaultDirectory();
      await directory?.removeEntry(`${asset.id}.asset`);
    } catch {
      // Metadata deletion still makes a missing OPFS entry unreachable.
    }
  } else {
    await runLocalStudioRequest("vaultBlobs", "readwrite", (store) => store.delete(asset.id));
  }
  await runLocalStudioRequest("vaultAssets", "readwrite", (store) => store.delete(asset.id));
}

export function toWorkspaceVaultAsset(asset: VaultAsset): WorkspaceAssetReference {
  return {
    assetId: asset.id,
    src: vaultAssetSrc(asset.id),
    alt: asset.name,
    title: asset.name,
    source: "upload",
    addedAt: Date.now(),
  };
}
