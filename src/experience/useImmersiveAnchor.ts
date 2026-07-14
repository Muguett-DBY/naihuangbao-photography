import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ScenePresetId } from "./scene-presets";
import { useExperienceStore } from "./ExperienceProvider";

type ImmersiveAnchorOptions = {
  id: string;
  preset: ScenePresetId;
  imageUrls: readonly string[];
};

function normalizedProgress(element: HTMLElement): number {
  const viewportHeight = Math.max(1, window.innerHeight);
  const bounds = element.getBoundingClientRect();
  const progress = (viewportHeight - bounds.top) / (viewportHeight + Math.max(1, bounds.height));
  return Math.min(1, Math.max(0, progress));
}

export function useImmersiveAnchor({ id, preset, imageUrls }: ImmersiveAnchorOptions) {
  const store = useExperienceStore();
  const teardownRef = useRef<(() => void) | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const descriptor = useMemo(
    () => ({ id, preset, imageUrls: [...imageUrls] }),
    [id, imageUrls, preset],
  );

  const anchorRef = useCallback((element: HTMLElement | null) => {
    if (elementRef.current === element) return;

    teardownRef.current?.();
    teardownRef.current = null;
    elementRef.current = element;
    if (element === null) return;

    const unregister = store.registerAnchor({ ...descriptor, element });
    let frame: number | null = null;
    const publishProgress = () => store.setScrollProgress(normalizedProgress(element));
    const onScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        publishProgress();
      });
    };
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        if (entry) store.setVisible(entry.isIntersecting && document.visibilityState === "visible");
      }, { threshold: 0.01 });

    observer?.observe(element);
    window.addEventListener("scroll", onScroll, { passive: true });
    publishProgress();

    let disposed = false;
    teardownRef.current = () => {
      if (disposed) return;
      disposed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      unregister();
      if (elementRef.current === element) elementRef.current = null;
    };
  }, [descriptor, store]);

  useEffect(() => () => teardownRef.current?.(), []);

  return anchorRef;
}
