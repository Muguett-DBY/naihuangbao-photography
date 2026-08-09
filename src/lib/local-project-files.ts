export type LocalProjectStorageStatus = {
  backend: "opfs" | "indexeddb";
  usage: number;
  quota: number;
  persisted: boolean;
};

function storageManager() {
  if (typeof navigator === "undefined" || !navigator.storage) return null;
  return navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
}

async function getFolder(folder: string, create: boolean) {
  const manager = storageManager();
  if (!manager?.getDirectory) return null;
  const root = await manager.getDirectory();
  const studio = await root.getDirectoryHandle("nhb-studio", { create });
  return studio.getDirectoryHandle(folder, { create });
}

export async function writeLocalProjectFile(folder: string, fileName: string, data: Blob) {
  try {
    const directory = await getFolder(folder, true);
    if (!directory) return false;
    const handle = await directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function readLocalProjectFile(folder: string, fileName: string) {
  try {
    const directory = await getFolder(folder, false);
    if (!directory) return null;
    return await (await directory.getFileHandle(fileName)).getFile();
  } catch {
    return null;
  }
}

export async function deleteLocalProjectFile(folder: string, fileName: string) {
  try {
    const directory = await getFolder(folder, false);
    if (!directory) return false;
    await directory.removeEntry(fileName);
    return true;
  } catch {
    return false;
  }
}

export async function getLocalProjectStorageStatus(): Promise<LocalProjectStorageStatus> {
  const manager = storageManager();
  const estimate: StorageEstimate = await manager?.estimate().catch(() => ({} as StorageEstimate)) ?? {};
  const persisted = await manager?.persisted?.().catch(() => false) ?? false;
  return {
    backend: manager?.getDirectory ? "opfs" : "indexeddb",
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? 0,
    persisted,
  };
}
