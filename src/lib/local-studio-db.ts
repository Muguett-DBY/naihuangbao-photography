const DATABASE_NAME = "nhb-local-studio";
const DATABASE_VERSION = 6;

export type LocalStudioStore =
  | "projects"
  | "compositions"
  | "compositionVersions"
  | "stories"
  | "workspaceProjects"
  | "workspaceEvents"
  | "vaultAssets"
  | "vaultBlobs"
  | "creativeDocuments"
  | "syncQueue";

export function openLocalStudioDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("projects")) {
        request.result.createObjectStore("projects", { keyPath: "id" });
      }
      if (!request.result.objectStoreNames.contains("compositions")) {
        request.result.createObjectStore("compositions", { keyPath: "id" });
      }
      if (!request.result.objectStoreNames.contains("compositionVersions")) {
        const versions = request.result.createObjectStore("compositionVersions", { keyPath: "id" });
        versions.createIndex("projectId", "projectId", { unique: false });
      }
      if (!request.result.objectStoreNames.contains("stories")) {
        request.result.createObjectStore("stories", { keyPath: "id" });
      }
      if (!request.result.objectStoreNames.contains("workspaceProjects")) {
        request.result.createObjectStore("workspaceProjects", { keyPath: "id" });
      }
      if (!request.result.objectStoreNames.contains("workspaceEvents")) {
        const events = request.result.createObjectStore("workspaceEvents", { keyPath: "id" });
        events.createIndex("projectId", "projectId", { unique: false });
        events.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!request.result.objectStoreNames.contains("vaultAssets")) {
        const assets = request.result.createObjectStore("vaultAssets", { keyPath: "id" });
        assets.createIndex("createdAt", "createdAt", { unique: false });
        assets.createIndex("perceptualHash", "analysis.perceptualHash", { unique: false });
      }
      if (!request.result.objectStoreNames.contains("vaultBlobs")) {
        request.result.createObjectStore("vaultBlobs", { keyPath: "id" });
      }
      if (!request.result.objectStoreNames.contains("creativeDocuments")) {
        const documents = request.result.createObjectStore("creativeDocuments", { keyPath: "id" });
        documents.createIndex("projectId", "projectId", { unique: false });
      }
      if (!request.result.objectStoreNames.contains("syncQueue")) {
        const queue = request.result.createObjectStore("syncQueue", { keyPath: "id" });
        queue.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

export function runLocalStudioRequest<T>(
  storeName: LocalStudioStore,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openLocalStudioDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    let result!: T;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(error);
    };
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => fail(request.error);
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(result);
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error ?? new Error("Local studio transaction was aborted."));
  }));
}
