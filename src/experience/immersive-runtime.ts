import type { ExperienceTier } from "./capability-tier";
import type { ExperienceSnapshot, ExperienceStore } from "./experience-store";
import { SCENE_PRESETS, type ScenePreset } from "./scene-presets";
import type { SceneDriver } from "./three-scene-driver";

type RenderedTier = Exclude<ExperienceTier, "static">;

export type FrameScheduler = {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
  now(): number;
};

export type ImmersiveRuntimeState = "booting" | "active" | "idle" | "suspended" | "static" | "disposed";

export type ImmersiveRuntimeOptions = {
  store: ExperienceStore;
  tier: ExperienceTier;
  createDriver(tier: RenderedTier): SceneDriver;
  scheduler: FrameScheduler;
  presets?: Readonly<Record<string, ScenePreset>>;
  onError?: (error: unknown) => void;
};

const FRAME_WINDOW_SIZE = 120;
const SLOW_FRAME_THRESHOLD_MS = 34;
const SLOW_FRAME_COUNT = 45;
const MEDIUM_FRAME_TARGET_MS = 1000 / 45;
const MEDIUM_RESYNC_THRESHOLD_MS = MEDIUM_FRAME_TARGET_MS * 1.5;

export class ImmersiveRuntime {
  private readonly store: ExperienceStore;
  private readonly scheduler: FrameScheduler;
  private readonly presets: Readonly<Record<string, ScenePreset>>;
  private readonly onError: (error: unknown) => void;
  private driver: SceneDriver | null = null;
  private unsubscribe: (() => void) | null = null;
  private pendingFrame: number | null = null;
  private frameDurations: number[] = [];
  private frameAccumulator = 0;
  private lastFrameTime: number;
  private committedSceneKey = "";
  private pendingSceneKey = "";
  private sceneRequest = 0;
  private stateValue: ImmersiveRuntimeState = "booting";
  private tierValue: ExperienceTier;
  private anchorIntersecting = true;
  private contextLost = false;
  private contextLossCount = 0;
  private driverSuspended = false;

  constructor(options: ImmersiveRuntimeOptions) {
    this.store = options.store;
    this.scheduler = options.scheduler;
    this.presets = options.presets ?? SCENE_PRESETS;
    this.onError = options.onError ?? ((error) => console.error("Immersive runtime error.", error));
    this.tierValue = options.tier;
    this.lastFrameTime = this.scheduler.now();

    if (options.tier === "static") {
      this.stateValue = "static";
      return;
    }

    try {
      this.driver = options.createDriver(options.tier);
    } catch (error) {
      this.stateValue = "static";
      this.tierValue = "static";
      this.report(error);
      return;
    }

    this.unsubscribe = this.store.subscribe(() => this.handleStoreChange());
    this.syncScene(this.store.getSnapshot());
    this.updateActivity();
  }

  get state(): ImmersiveRuntimeState {
    return this.stateValue;
  }

  get tier(): ExperienceTier {
    return this.tierValue;
  }

  setSize(width: number, height: number): void {
    if (!this.driver || this.isTerminal()) return;
    this.driver.setSize(width, height);
    this.requestFrame();
  }

  setAnchorIntersecting(intersecting: boolean): void {
    if (this.anchorIntersecting === intersecting || this.isTerminal()) return;
    this.anchorIntersecting = intersecting;
    this.updateActivity();
  }

  handleContextLost(): void {
    if (!this.driver || this.isTerminal()) return;
    this.contextLossCount += 1;
    this.contextLost = true;
    this.cancelFrame();

    if (this.contextLossCount > 1) {
      this.lockStatic();
      return;
    }

    this.suspendDriver();
    this.stateValue = "suspended";
  }

  handleContextRestored(): void {
    if (!this.driver || this.isTerminal() || !this.contextLost || this.contextLossCount !== 1) return;
    this.contextLost = false;
    this.updateActivity();
  }

  dispose(): void {
    if (this.stateValue === "disposed") return;
    this.stateValue = "disposed";
    this.cleanupTerminal();
  }

  private handleStoreChange(): void {
    if (this.isTerminal()) return;
    const snapshot = this.store.getSnapshot();
    this.syncScene(snapshot);
    this.updateActivity();
    if (this.stateValue === "idle" && snapshot.visible && !snapshot.paused) this.requestFrame();
  }

  private syncScene(snapshot: ExperienceSnapshot): void {
    if (!this.driver) return;
    const presetId = snapshot.anchor?.preset ?? snapshot.route;
    if (!presetId) return;
    const preset = this.presets[presetId];
    if (!preset) return;
    const imageUrls = snapshot.anchor ? [...snapshot.anchor.imageUrls] : [];
    const sceneKey = `${presetId}\u0000${imageUrls.join("\u0000")}`;
    if (sceneKey === this.committedSceneKey || sceneKey === this.pendingSceneKey) return;
    const request = ++this.sceneRequest;
    this.pendingSceneKey = sceneKey;

    let morph: Promise<void>;
    try {
      morph = this.driver.morphTo(preset, imageUrls);
    } catch (error) {
      if (request === this.sceneRequest) this.pendingSceneKey = "";
      this.report(error);
      return;
    }

    void morph.then(
      () => {
        if (request !== this.sceneRequest || this.isTerminal()) return;
        this.committedSceneKey = sceneKey;
        this.pendingSceneKey = "";
      },
      (error) => {
        if (request === this.sceneRequest) this.pendingSceneKey = "";
        this.report(error);
      },
    );
  }

  private updateActivity(): void {
    if (!this.driver || this.isTerminal()) return;
    const snapshot = this.store.getSnapshot();
    if (this.contextLost || !snapshot.visible || snapshot.paused) {
      this.stateValue = "suspended";
      this.suspendDriver();
      this.cancelFrame();
      this.frameAccumulator = 0;
      return;
    }

    const presetId = snapshot.anchor?.preset ?? snapshot.route;
    const preset = presetId ? this.presets[presetId] : undefined;
    const idleAfterHero = Boolean(preset?.idleAfterHero && snapshot.scrollProgress >= 0.98);
    if (!this.anchorIntersecting || idleAfterHero) {
      this.stateValue = "idle";
      this.resumeDriver();
      this.cancelFrame();
      return;
    }

    const wasActive = this.stateValue === "active";
    const wasBooting = this.stateValue === "booting";
    this.stateValue = "active";
    if (!wasActive) {
      if (!wasBooting) this.resumeDriver();
      this.lastFrameTime = this.scheduler.now();
      this.frameAccumulator = 0;
    }
    this.requestFrame();
  }

  private requestFrame(): void {
    if (!this.driver || this.pendingFrame !== null || this.isTerminal()) return;
    if (this.stateValue !== "active" && this.stateValue !== "idle") return;
    this.pendingFrame = this.scheduler.request((time) => this.onFrame(time));
  }

  private onFrame(time: number): void {
    this.pendingFrame = null;
    if (!this.driver || (this.stateValue !== "active" && this.stateValue !== "idle")) return;
    const snapshot = this.store.getSnapshot();
    const frameState = this.stateValue;
    const elapsed = Math.max(0, time - this.lastFrameTime);
    this.lastFrameTime = time;
    const delta = frameState === "idle" ? 0 : elapsed;

    const cadenceLimited = this.tierValue === "medium" && frameState === "active";
    if (cadenceLimited) {
      this.frameAccumulator = delta >= MEDIUM_RESYNC_THRESHOLD_MS
        ? MEDIUM_FRAME_TARGET_MS
        : this.frameAccumulator + delta;
      if (this.frameAccumulator < MEDIUM_FRAME_TARGET_MS) {
        if (this.stateValue === "active") this.requestFrame();
        return;
      }
    }

    const renderDelta = cadenceLimited ? this.frameAccumulator : delta;
    if (cadenceLimited) this.frameAccumulator -= MEDIUM_FRAME_TARGET_MS;
    this.driver.render({
      time,
      delta: renderDelta,
      pointerX: snapshot.pointerX,
      pointerY: snapshot.pointerY,
      scrollProgress: snapshot.scrollProgress,
    });

    if (this.tierValue === "high" && frameState === "active") this.recordFrameDuration(delta);
    if (this.stateValue === "active") this.requestFrame();
  }

  private recordFrameDuration(duration: number): void {
    this.frameDurations.push(duration);
    if (this.frameDurations.length > FRAME_WINDOW_SIZE) this.frameDurations.shift();
    if (this.frameDurations.length < FRAME_WINDOW_SIZE) return;
    const slowFrames = this.frameDurations.reduce(
      (count, frameDuration) => count + Number(frameDuration > SLOW_FRAME_THRESHOLD_MS),
      0,
    );
    if (slowFrames < SLOW_FRAME_COUNT || !this.driver) return;

    this.tierValue = "medium";
    this.frameDurations = [];
    this.frameAccumulator = 0;
    try {
      this.driver.setTier("medium");
    } catch (error) {
      this.report(error);
      this.lockStatic();
    }
  }

  private suspendDriver(): void {
    if (!this.driver || this.driverSuspended) return;
    this.driverSuspended = true;
    this.driver.suspend();
  }

  private resumeDriver(): void {
    if (!this.driver || !this.driverSuspended) return;
    this.driverSuspended = false;
    this.driver.resume();
  }

  private cancelFrame(): void {
    if (this.pendingFrame === null) return;
    const frame = this.pendingFrame;
    this.pendingFrame = null;
    try {
      this.scheduler.cancel(frame);
    } catch (error) {
      this.report(error);
    }
  }

  private lockStatic(): void {
    this.tierValue = "static";
    this.stateValue = "static";
    this.cleanupTerminal();
  }

  private cleanupTerminal(): void {
    const errors: unknown[] = [];
    this.sceneRequest += 1;
    this.pendingSceneKey = "";
    if (this.pendingFrame !== null) {
      const frame = this.pendingFrame;
      this.pendingFrame = null;
      try {
        this.scheduler.cancel(frame);
      } catch (error) {
        errors.push(error);
      }
    }

    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    try {
      unsubscribe?.();
    } catch (error) {
      errors.push(error);
    }

    const driver = this.driver;
    this.driver = null;
    try {
      driver?.dispose();
    } catch (error) {
      errors.push(error);
    }

    if (errors.length > 0) this.report(new AggregateError(errors, "Immersive runtime cleanup failed."));
  }

  private report(error: unknown): void {
    try {
      this.onError(error);
    } catch {
      // Reporting is deliberately non-fatal to runtime ownership.
    }
  }

  private isTerminal(): boolean {
    return this.stateValue === "static" || this.stateValue === "disposed";
  }
}
