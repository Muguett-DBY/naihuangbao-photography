import { useCallback, useEffect, useState } from "react";
import { safeLocalStorage } from "../lib/browser-storage";

const STORAGE_KEY = "nhb-archive-exhibition-v1";
const EVENT_NAME = "nhb:archive-collection:changed";
const MAX_ITEMS = 24;

export function readArchiveCollection() {
  const raw = safeLocalStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((item): item is string => typeof item === "string"))].slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function writeCollection(ids: string[]) {
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useArchiveCollection() {
  const [assetIds, setAssetIds] = useState<string[]>(readArchiveCollection);

  useEffect(() => {
    const sync = () => setAssetIds(readArchiveCollection());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((assetId: string) => {
    const current = readArchiveCollection();
    const next = current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : [assetId, ...current].slice(0, MAX_ITEMS);
    writeCollection(next);
    setAssetIds(next);
  }, []);

  const clear = useCallback(() => {
    writeCollection([]);
    setAssetIds([]);
  }, []);

  const has = useCallback((assetId: string) => assetIds.includes(assetId), [assetIds]);

  return { assetIds, count: assetIds.length, has, toggle, clear };
}
