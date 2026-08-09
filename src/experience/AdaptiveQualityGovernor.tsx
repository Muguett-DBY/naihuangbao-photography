import "../styles/adaptive-quality-v7.css";
import { useEffect } from "react";
import { experienceTierFromDataset, RUNTIME_QUALITY_EVENT, selectAdaptiveQuality } from "../lib/adaptive-quality";
import type { ExperienceTier } from "./capability-tier";

type QualityEvent = CustomEvent<{ tier: ExperienceTier }>;
type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean; addEventListener?: EventTarget["addEventListener"]; removeEventListener?: EventTarget["removeEventListener"] } };

export function AdaptiveQualityGovernor() {
  useEffect(() => {
    const root = document.documentElement;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as NavigatorWithConnection).connection;
    let runtimeTier = experienceTierFromDataset(root.dataset.experienceTier);
    let longTaskCount = 0;

    const commit = () => {
      root.dataset.runtimeQuality = selectAdaptiveQuality({
        tier: runtimeTier,
        reducedMotion: motionQuery.matches,
        saveData: connection?.saveData ?? false,
        hidden: document.visibilityState === "hidden",
        longTaskCount,
      });
    };

    const onRuntimeQuality = (event: Event) => {
      runtimeTier = (event as QualityEvent).detail.tier;
      commit();
    };
    const onVisibility = () => commit();
    const onConnection = () => commit();
    const observer = typeof PerformanceObserver === "undefined" ? null : new PerformanceObserver((list) => {
      longTaskCount += list.getEntries().filter((entry) => entry.duration >= 50).length;
      commit();
    });

    try { observer?.observe({ type: "longtask", buffered: true }); } catch { /* Long Task API is optional. */ }
    window.addEventListener(RUNTIME_QUALITY_EVENT, onRuntimeQuality);
    document.addEventListener("visibilitychange", onVisibility);
    motionQuery.addEventListener("change", commit);
    connection?.addEventListener?.("change", onConnection);
    commit();

    return () => {
      observer?.disconnect();
      window.removeEventListener(RUNTIME_QUALITY_EVENT, onRuntimeQuality);
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", commit);
      connection?.removeEventListener?.("change", onConnection);
      delete root.dataset.runtimeQuality;
    };
  }, []);

  return null;
}
