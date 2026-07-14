import { useCallback, useEffect, useMemo, useRef } from "react";
import { createImageUrlStabilizer } from "./experience-controller";
import type { ScenePresetId } from "./scene-presets";
import { useExperienceRuntimeBridge, useExperienceStore } from "./ExperienceProvider";

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
  const runtimeBridge = useExperienceRuntimeBridge();
  const teardownRef = useRef<(() => void) | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const stabilizeRef = useRef<ReturnType<typeof createImageUrlStabilizer> | null>(null);
  if (stabilizeRef.current === null) stabilizeRef.current = createImageUrlStabilizer();
  const stableImageUrls = stabilizeRef.current(imageUrls);
  const descriptor = useMemo(
    () => ({ id, preset, imageUrls: stableImageUrls }),
    [id, preset, stableImageUrls],
  );

  const anchorRef = useCallback((element: HTMLElement | null) => {
    if (elementRef.current === element) return;

    teardownRef.current?.();
    teardownRef.current = null;
    elementRef.current = element;
    if (element === null) return;

    runtimeBridge.setAnchorIntersecting(false);
    const unregister = store.registerAnchor({ ...descriptor, imageUrls: [...descriptor.imageUrls], element });
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
        if (entry) runtimeBridge.setAnchorIntersecting(entry.isIntersecting);
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
      runtimeBridge.setAnchorIntersecting(false);
      if (elementRef.current === element) elementRef.current = null;
    };
  }, [descriptor, runtimeBridge, store]);

  useEffect(() => () => teardownRef.current?.(), []);

  return anchorRef;
}
