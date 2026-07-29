import type { ExperienceTier } from "./capability-tier";

export type AnchorIntersectionRuntime = {
  setAnchorIntersecting(intersecting: boolean): void;
  releaseTransientTextures?(): void;
};

export type AnchorRegistration = {
  setIntersecting(intersecting: boolean): void;
  unregister(): void;
};

type Cancel = () => void;

export class ExperienceRuntimeBridge {
  private runtime: AnchorIntersectionRuntime | null = null;
  private anchorToken: symbol | null = null;
  private anchorIntersecting = true;

  registerRuntime(runtime: AnchorIntersectionRuntime): Cancel {
    this.runtime = runtime;
    runtime.setAnchorIntersecting(this.effectiveAnchorIntersection());

    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      if (this.runtime === runtime) this.runtime = null;
    };
  }

  registerAnchor(intersecting: boolean): AnchorRegistration {
    const token = Symbol("immersive-anchor");
    this.anchorToken = token;
    this.anchorIntersecting = intersecting;
    this.publishAnchorIntersection();

    let active = true;
    return {
      setIntersecting: (nextIntersecting) => {
        if (!active || this.anchorToken !== token || this.anchorIntersecting === nextIntersecting) return;
        this.anchorIntersecting = nextIntersecting;
        this.publishAnchorIntersection();
      },
      unregister: () => {
        if (!active) return;
        active = false;
        if (this.anchorToken !== token) return;
        this.anchorToken = null;
        this.anchorIntersecting = true;
        this.publishAnchorIntersection();
      },
    };
  }

  releaseTransientTextures(): void {
    this.runtime?.releaseTransientTextures?.();
  }

  private effectiveAnchorIntersection(): boolean {
    return this.anchorToken === null || this.anchorIntersecting;
  }

  private publishAnchorIntersection(): void {
    this.runtime?.setAnchorIntersecting(this.effectiveAnchorIntersection());
  }
}

export type DeferredExperienceLoadOptions = {
  load(): void;
  scheduleIdle(callback: () => void): Cancel;
  scheduleDeadline(callback: () => void, delayMs: number): Cancel;
  subscribeImmediateTrigger(callback: () => void): Cancel;
};

export function createDeferredExperienceLoad(options: DeferredExperienceLoadOptions): Cancel {
  let active = true;
  let started = false;
  let cleared = false;
  let cancelIdle: Cancel | null = null;
  let cancelDeadline: Cancel | null = null;
  let unsubscribeTrigger: Cancel | null = null;

  const clearPending = () => {
    if (cleared) return;
    cleared = true;
    cancelIdle?.();
    cancelDeadline?.();
    unsubscribeTrigger?.();
    cancelIdle = null;
    cancelDeadline = null;
    unsubscribeTrigger = null;
  };

  const start = () => {
    if (!active || started) return;
    started = true;
    clearPending();
    options.load();
  };

  const idleCancel = options.scheduleIdle(start);
  if (cleared) idleCancel();
  else cancelIdle = idleCancel;

  const deadlineCancel = options.scheduleDeadline(start, 120);
  if (cleared) deadlineCancel();
  else cancelDeadline = deadlineCancel;

  const triggerCancel = options.subscribeImmediateTrigger(start);
  if (cleared) triggerCancel();
  else unsubscribeTrigger = triggerCancel;

  return () => {
    if (!active) return;
    active = false;
    clearPending();
  };
}

export function isImmersiveCanvasReady(tier: ExperienceTier): boolean {
  return tier !== "static";
}

export type ImageUrlStabilizer = (imageUrls: readonly string[]) => readonly string[];

export function createImageUrlStabilizer(): ImageUrlStabilizer {
  let previousKey: string | null = null;
  let previousValue: readonly string[] = Object.freeze([]);

  return (imageUrls) => {
    const key = JSON.stringify(imageUrls);
    if (key === previousKey) return previousValue;
    previousKey = key;
    previousValue = Object.freeze([...imageUrls]);
    return previousValue;
  };
}
