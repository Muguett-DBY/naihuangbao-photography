import { useEffect, useRef } from "react";
import { Color } from "three";
import type { ExperienceTier } from "./capability-tier";
import { isImmersiveCanvasReady } from "./experience-controller";
import { useExperienceRuntimeBridge, useExperienceStore } from "./ExperienceProvider";
import { ImmersiveRuntime } from "./immersive-runtime";
import { createThreeSceneDriver } from "./three-scene-driver";

const placeholderColor = new Color();

type ImmersiveExperienceProps = {
  tier: Exclude<ExperienceTier, "static">;
};

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
    });
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

    return () => {
      if (disposed) return;
      disposed = true;
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      unsubscribeCanvasState();
      unregisterRuntime();
      runtime.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
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
