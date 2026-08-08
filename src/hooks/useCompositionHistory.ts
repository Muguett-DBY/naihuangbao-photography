import { useCallback, useEffect, useRef, useState } from "react";
import type { CompositionImage, CompositionTextAlign } from "../types/composition";
import type { CompositionMode } from "../lib/composition-layout";

export type CompositionEditableState = {
  projectName: string;
  mode: CompositionMode;
  images: CompositionImage[];
  title: string;
  caption: string;
  paperColor: string;
  textAlign: CompositionTextAlign;
  titleScale: number;
  selectedImageId: string | null;
};

const MAX_COMPOSITION_HISTORY = 40;

export function useCompositionHistory(initialState: CompositionEditableState) {
  const [state, setState] = useState(initialState);
  const [historyState, setHistoryState] = useState({ past: 0, future: 0 });
  const pastRef = useRef<CompositionEditableState[]>([]);
  const futureRef = useRef<CompositionEditableState[]>([]);

  const syncCounts = useCallback(() => {
    setHistoryState({ past: pastRef.current.length, future: futureRef.current.length });
  }, []);

  const update = useCallback((updater: Partial<CompositionEditableState> | ((current: CompositionEditableState) => CompositionEditableState)) => {
    setState((current) => {
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      if (next === current) return current;
      pastRef.current = [...pastRef.current.slice(-(MAX_COMPOSITION_HISTORY - 1)), current];
      futureRef.current = [];
      queueMicrotask(syncCounts);
      return next;
    });
  }, [syncCounts]);

  const replace = useCallback((next: CompositionEditableState) => {
    pastRef.current = [];
    futureRef.current = [];
    setState(next);
    syncCounts();
  }, [syncCounts]);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = pastRef.current.at(-1);
      if (!previous) return current;
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [current, ...futureRef.current].slice(0, MAX_COMPOSITION_HISTORY);
      queueMicrotask(syncCounts);
      return previous;
    });
  }, [syncCounts]);

  const redo = useCallback(() => {
    setState((current) => {
      const next = futureRef.current[0];
      if (!next) return current;
      futureRef.current = futureRef.current.slice(1);
      pastRef.current = [...pastRef.current, current].slice(-MAX_COMPOSITION_HISTORY);
      queueMicrotask(syncCounts);
      return next;
    });
  }, [syncCounts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable=true]")) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  return { state, update, replace, undo, redo, canUndo: historyState.past > 0, canRedo: historyState.future > 0 };
}
