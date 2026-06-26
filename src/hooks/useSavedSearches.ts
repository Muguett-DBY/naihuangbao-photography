import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nhb-saved-searches";
const EVENT_NAME = "nhb:saved-searches:changed";
const MAX_ITEMS = 8;

export type SavedSearch = {
  id: string;
  filter: string;
  album: string;
  dateRange: string;
  search: string;
  view: string;
  sort: string;
  label: string;
  savedAt: number;
};

function readStored(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is SavedSearch =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as SavedSearch).id === "string" &&
          typeof (entry as SavedSearch).filter === "string",
      )
      .map((entry) => ({
        ...entry,
        album: typeof entry.album === "string" ? entry.album : "all",
        dateRange: typeof entry.dateRange === "string" ? entry.dateRange : "all",
        sort: typeof entry.sort === "string" ? entry.sort : "default",
      }))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeStored(entries: SavedSearch[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

export function useSavedSearches() {
  const [entries, setEntries] = useState<SavedSearch[]>(readStored);

  useEffect(() => {
    const onChange = () => setEntries(readStored());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const save = useCallback(
    (entry: Omit<SavedSearch, "id" | "savedAt">) => {
      const current = readStored();
      const id = `${entry.filter}::${entry.album}::${entry.dateRange}::${entry.search}::${entry.view}::${entry.sort}`;
      const filtered = current.filter((item) => item.id !== id);
      const next: SavedSearch[] = [
        { ...entry, id, savedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      writeStored(next);
      setEntries(next);
    },
    [],
  );

  const remove = useCallback((id: string) => {
    const next = readStored().filter((item) => item.id !== id);
    writeStored(next);
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    writeStored([]);
    setEntries([]);
  }, []);

  return { entries, save, remove, clear };
}
