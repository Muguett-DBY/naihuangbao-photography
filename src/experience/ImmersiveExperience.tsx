import { useEffect, useRef } from "react";
import { Color } from "three";
import type { ExperienceTier } from "./capability-tier";
import { isImmersiveCanvasReady } from "./experience-controller";
import { useExperienceRuntimeBridge, useExperienceStore } from "./ExperienceProvider";
import { ImmersiveRuntime } from "./immersive-runtime";
import { createThreeSceneDriver } from "./three-scene-driver";
import { RUNTIME_QUALITY_EVENT } from "../lib/adaptive-quality";

const placeholderColor = new Color();

type ImmersiveExperienceProps = {
  tier: Exclude<ExperienceTier, "static">;
};

export type ExperienceDiagnostics = {
  readonly status: ImmersiveRuntime["state"];
  readonly tier: ExperienceTier;
  readonly frameCount: number;
  readonly frameP95Ms: number;
  readonly contextCount: number;
  readonly textureBytes: number;
  readonly preset: string | null;
};

declare global {
  interface Window {
    __nhbExperience?: ExperienceDiagnostics;
  }
}

let activeContextCount = 0;

function shouldExposeExperienceDiagnostics(): boolean {
  const hostname = window.location.hostname;
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  return loopback && navigator.webdriver;
}

export function ImmersiveExperience({ tier }: ImmersiveExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<ImmersiveRuntime | null>(null);
  const store = useExperienceStore();
  const runtimeBridge = useExperienceRuntimeBridge();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const runtime = new ImmersiveRuntime({
      store,
      tier,
      createDriver: (renderedTier) => createThreeSceneDriver({ canvas, tier: renderedTier }),
      scheduler: {
        request: (callback) => window.requestAnimationFrame(callback),
        cancel: (frame) => window.cancelAnimationFrame(frame),
        now: () => performance.now(),
      },
      onTierChange: (nextTier) => window.dispatchEvent(new CustomEvent(RUNTIME_QUALITY_EVENT, { detail: { tier: nextTier } })),
    });
    const ownsContext = runtime.tier !== "static";
    if (ownsContext) activeContextCount += 1;
    runtimeRef.current = runtime;
    const unregisterRuntime = runtimeBridge.registerRuntime(runtime);
    let scenePreset: string | null = null;
    let highlightedId: string | null = null;
    const syncCanvasState = () => {
      const snapshot = store.getSnapshot();
      const nextPreset = snapshot.anchor?.preset ?? snapshot.route;
      if (scenePreset !== nextPreset) {
        scenePreset = nextPreset;
        if (nextPreset) canvas.dataset.scenePreset = nextPreset;
        else delete canvas.dataset.scenePreset;
      }
      if (highlightedId !== snapshot.highlightedId) {
        highlightedId = snapshot.highlightedId;
        if (highlightedId) canvas.dataset.highlightedId = highlightedId;
        else delete canvas.dataset.highlightedId;
      }
    };
    const unsubscribeCanvasState = store.subscribe(syncCanvasState);

    const syncReadiness = () => {
      if (isImmersiveCanvasReady(runtime.tier)) document.documentElement.dataset.immersiveReady = "true";
      else delete document.documentElement.dataset.immersiveReady;
    };

    const resize = () => runtime.setSize(canvas.clientWidth, canvas.clientHeight);
    const resizeObserver = new ResizeObserver(resize);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      runtime.handleContextLost();
      syncReadiness();
    };
    const onContextRestored = () => {
      runtime.handleContextRestored();
      syncReadiness();
    };
    let disposed = false;

    resizeObserver.observe(canvas);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    resize();
    syncCanvasState();
    syncReadiness();

    const diagnostics: ExperienceDiagnostics = {
      get status() { return runtime.state; },
      get tier() { return runtime.tier; },
      get frameCount() { return runtime.frameCount; },
      get frameP95Ms() { return runtime.frameP95Ms; },
      get contextCount() { return activeContextCount; },
      get textureBytes() { return runtime.textureBytes; },
      get preset() {
        const snapshot = store.getSnapshot();
        return snapshot.anchor?.preset ?? snapshot.route;
      },
    };
    if (shouldExposeExperienceDiagnostics()) window.__nhbExperience = diagnostics;

    return () => {
      if (disposed) return;
      disposed = true;
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      unsubscribeCanvasState();
      unregisterRuntime();
      runtime.dispose();
      if (ownsContext) activeContextCount = Math.max(0, activeContextCount - 1);
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      if (window.__nhbExperience === diagnostics) delete window.__nhbExperience;
      window.dispatchEvent(new CustomEvent(RUNTIME_QUALITY_EVENT, { detail: { tier: "static" } }));
      delete document.documentElement.dataset.immersiveReady;
    };
  }, [runtimeBridge, store, tier]);

  void placeholderColor;
  return (
    <div className={`immersive-experience immersive-experience--${tier}`} aria-hidden="true">
      <canvas ref={canvasRef} className="immersive-experience-canvas" tabIndex={-1} />
    </div>
  );
}
