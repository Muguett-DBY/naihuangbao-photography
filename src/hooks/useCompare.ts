import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nhb-compare-photos";
const EVENT_NAME = "nhb:compare:changed";
const MAX_ITEMS = 2;

export type CompareEntry = {
  id: string;
  title?: string;
  href: string;
  imageUrl?: string;
  addedAt: number;
};

function readStored(): CompareEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is CompareEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as CompareEntry).id === "string",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeStored(entries: CompareEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

export function useCompare() {
  const [entries, setEntries] = useState<CompareEntry[]>(readStored);

  useEffect(() => {
    const onChange = () => setEntries(readStored());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const isComparing = useCallback((id: string) => entries.some((e) => e.id === id), [entries]);

  const toggle = useCallback((entry: Omit<CompareEntry, "addedAt">): boolean => {
    const current = readStored();
    const exists = current.some((e) => e.id === entry.id);
    let next: CompareEntry[];
    if (exists) {
      next = current.filter((e) => e.id !== entry.id);
    } else if (current.length >= MAX_ITEMS) {
      next = [{ ...entry, addedAt: Date.now() }, ...current.slice(1)];
    } else {
      next = [{ ...entry, addedAt: Date.now() }, ...current];
    }
    writeStored(next);
    setEntries(next);
    return !exists;
  }, []);

  const clear = useCallback(() => {
    writeStored([]);
    setEntries([]);
  }, []);

  const remove = useCallback((id: string) => {
    const next = readStored().filter((e) => e.id !== id);
    writeStored(next);
    setEntries(next);
  }, []);

  return { entries, isComparing, toggle, clear, remove, count: entries.length, maxItems: MAX_ITEMS };
}
