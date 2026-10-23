import { safeLocalStorage } from "./browser-storage";
import type { PublishedProjectReceipt } from "../types/published-project";

const PUBLICATION_REGISTRY_KEY = "nhb-publication-registry-v1";
type PublicationRegistry = Record<string, PublishedProjectReceipt>;

function readRegistry(): PublicationRegistry {
  try {
    const parsed = JSON.parse(safeLocalStorage.getItem(PUBLICATION_REGISTRY_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getLocalPublication(projectId: string) {
  return readRegistry()[projectId] ?? null;
}

export function rememberLocalPublication(projectId: string, receipt: PublishedProjectReceipt) {
  const registry = readRegistry();
  registry[projectId] = receipt;
  safeLocalStorage.setItem(PUBLICATION_REGISTRY_KEY, JSON.stringify(registry));
}
