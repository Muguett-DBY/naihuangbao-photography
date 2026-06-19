import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nhb-recently-viewed-photos";
const MAX_ITEMS = 12;

export type RecentlyViewedEntry = {
  id: string;
  title?: string;
  href: string;
  imageUrl?: string;
  visitedAt: number;
};

function readStored(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentlyViewedEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as RecentlyViewedEntry).id === "string" &&
          typeof (entry as RecentlyViewedEntry).href === "string",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeStored(entries: RecentlyViewedEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("nhb:recently-viewed:changed"));
  } catch {
    // ignore quota errors
  }
}

function broadcastChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nhb:recently-viewed:changed"));
}

export function useRecentlyViewed() {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>(readStored);

  useEffect(() => {
    const onChange = () => setEntries(readStored());
    window.addEventListener("nhb:recently-viewed:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("nhb:recently-viewed:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const recordVisit = useCallback((entry: Omit<RecentlyViewedEntry, "visitedAt">) => {
    const current = readStored();
    const filtered = current.filter((existing) => existing.id !== entry.id);
    const next: RecentlyViewedEntry[] = [
      { ...entry, visitedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    writeStored(next);
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    writeStored([]);
    setEntries([]);
  }, []);

  return { entries, recordVisit, clear };
}

export function getRecentlyViewedSync(): RecentlyViewedEntry[] {
  return readStored();
}

export { broadcastChange };
