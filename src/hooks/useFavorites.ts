import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nhb-favorite-photos";
const EVENT_NAME = "nhb:favorites:changed";
const MAX_ITEMS = 100;

export type FavoriteEntry = {
  id: string;
  title?: string;
  href: string;
  imageUrl?: string;
  addedAt: number;
};

function readStored(): FavoriteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is FavoriteEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as FavoriteEntry).id === "string" &&
          typeof (entry as FavoriteEntry).href === "string",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeStored(entries: FavoriteEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

export function useFavorites() {
  const [entries, setEntries] = useState<FavoriteEntry[]>(readStored);

  useEffect(() => {
    const onChange = () => setEntries(readStored());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const isFavorite = useCallback(
    (id: string) => entries.some((entry) => entry.id === id),
    [entries],
  );

  const toggle = useCallback((entry: Omit<FavoriteEntry, "addedAt">): boolean => {
    const current = readStored();
    const exists = current.some((item) => item.id === entry.id);
    const next = exists
      ? current.filter((item) => item.id !== entry.id)
      : [{ ...entry, addedAt: Date.now() }, ...current].slice(0, MAX_ITEMS);
    writeStored(next);
    setEntries(next);
    return !exists;
  }, []);

  const remove = useCallback((id: string) => {
    const next = readStored().filter((item) => item.id !== id);
    writeStored(next);
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    writeStored([]);
    setEntries([]);
  }, []);

  return { entries, isFavorite, toggle, remove, clear, count: entries.length };
}
