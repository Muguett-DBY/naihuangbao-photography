import * as THREE from "three";
import type { ExperienceTier } from "./capability-tier";
import { applyPresetGeometry, createContactSheetGroup, createFocusRailGroup, createShutterGroup, disposeOpticalGroup } from "./optical-geometry";
import { ResourceRegistry } from "./resource-registry";
import type { ScenePreset } from "./scene-presets";
import { TexturePool, type TextureLease } from "./texture-pool";

type RenderedTier = Exclude<ExperienceTier, "static">;

export type SceneFrame = {
  time: number;
  delta: number;
  pointerX: number;
  pointerY: number;
  scrollProgress: number;
};

export type SceneDriver = {
  setTier(tier: RenderedTier): void;
  setSize(width: number, height: number): void;
  morphTo(preset: ScenePreset, imageUrls: string[]): Promise<void>;
  render(frame: SceneFrame): void;
  suspend(): void;
  resume(): void;
  samplePixels(): Promise<Uint8Array>;
  dispose(): void;
};

export type ThreeSceneDriverOptions = {
  canvas: HTMLCanvasElement;
  tier: RenderedTier;
  texturePool?: TexturePool<THREE.Texture>;
  idleScheduler?: IdleScheduler;
  onError?: (error: unknown) => void;
};

export type IdleScheduler = {
  request(callback: () => void): number;
  cancel(id: number): void;
};

export type TextureMorphCoordinatorOptions<T> = {
  pool: TexturePool<T>;
  idleScheduler: IdleScheduler;
  onCommit(slots: ReadonlyArray<T | null>): void;
  onUpdate(index: number, value: T | null): void;
  onError?(error: unknown): void;
};

type MorphCandidate = {
  index: number;
  url: string;
};

type VisibleResource = MorphCandidate & {
  lease: TextureLease;
};

function createDefaultIdleScheduler(): IdleScheduler {
  const host = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  return {
    request(callback) {
      return host.requestIdleCallback?.(callback) ?? globalThis.setTimeout(callback, 0);
    },
    cancel(id) {
      if (host.cancelIdleCallback) host.cancelIdleCallback(id);
      else globalThis.clearTimeout(id);
    },
  };
}

export class TextureMorphCoordinator<T> {
  private readonly pool: TexturePool<T>;
  private readonly idleScheduler: IdleScheduler;
  private readonly onCommit: TextureMorphCoordinatorOptions<T>["onCommit"];
  private readonly onUpdate: TextureMorphCoordinatorOptions<T>["onUpdate"];
  private readonly onError: (error: unknown) => void;
  private generation = 0;
  private idleTask: number | null = null;
  private stagedLease: TextureLease | null = null;
  private backgroundLease: TextureLease | null = null;
  private visibleResources: VisibleResource[] = [];
  private settleCurrent: (() => void) | null = null;
  private disposed = false;

  constructor(options: TextureMorphCoordinatorOptions<T>) {
    this.pool = options.pool;
    this.idleScheduler = options.idleScheduler;
    this.onCommit = options.onCommit;
    this.onUpdate = options.onUpdate;
    this.onError = options.onError ?? (() => undefined);
  }

  morph(imageUrls: string[], maxSlots: number): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const version = ++this.generation;
    this.finishCurrent();
    this.cancelIdle();
    this.release(this.stagedLease);
    this.release(this.backgroundLease);
    this.stagedLease = null;
    this.backgroundLease = null;

    const requested = imageUrls.slice(0, Math.max(0, maxSlots));
    const slots: Array<T | null> = Array.from({ length: Math.max(1, requested.length) }, () => null);
    const candidates: MorphCandidate[] = [];
    requested.forEach((url, index) => {
      try {
        candidates.push({ index, url: this.pool.normalize(url) });
      } catch {
        // Unsupported route media is represented by an ink slot.
      }
    });

    if (candidates.length === 0) {
      this.commitFallback(version, slots);
      return Promise.resolve();
    }

    const candidateUrls = candidates.map((candidate) => candidate.url);
    let stagedLease: TextureLease;
    try {
      stagedLease = this.pool.pin(candidateUrls);
      this.stagedLease = stagedLease;
      this.pool.retain([...this.visibleResources.map((resource) => resource.url), ...candidateUrls]);
    } catch (error) {
      this.release(this.stagedLease);
      this.stagedLease = null;
      this.report(error);
      this.commitFallback(version, slots);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.settleCurrent = resolve;
      const critical = candidates.slice(0, 3);
      let completedCritical = 0;
      let committed = false;

      const commit = () => {
        if (committed || this.disposed || version !== this.generation) return;
        committed = true;
        this.commitSlots(version, slots, candidates, stagedLease);
        this.finishCurrent();
        this.scheduleIdle(version, candidates.slice(3), slots);
      };

      for (const candidate of critical) {
        let pending: Promise<T>;
        try {
          pending = this.pool.acquire(candidate.url);
        } catch {
          completedCritical += 1;
          if (completedCritical === critical.length) commit();
          continue;
        }

        void pending.then(
          (value) => {
            if (this.disposed || version !== this.generation) return;
            slots[candidate.index] = value;
            completedCritical += 1;
            if (!committed) commit();
            else this.update(candidate, value);
          },
          () => {
            if (this.disposed || version !== this.generation) return;
            completedCritical += 1;
            if (!committed && completedCritical === critical.length) commit();
          },
        );
      }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.finishCurrent();
    this.cancelIdle();
    this.release(this.stagedLease);
    this.release(this.backgroundLease);
    this.releaseMany(this.visibleResources.map((resource) => resource.lease));
    this.stagedLease = null;
    this.backgroundLease = null;
    this.visibleResources = [];
    this.retain([]);
  }

  enforceBudget(maxBytes: number): void {
    if (this.disposed) return;
    this.generation += 1;
    this.finishCurrent();
    this.cancelIdle();
    this.release(this.backgroundLease);
    this.backgroundLease = null;
    this.retain(this.visibleResources.map((resource) => resource.url));
    this.setBudget(maxBytes);

    while (this.pool.totalBytes > maxBytes && this.visibleResources.length > 0) {
      const resource = this.visibleResources.pop();
      if (!resource) break;
      try {
        this.onUpdate(resource.index, null);
      } catch (error) {
        this.report(error);
      }
      this.release(resource.lease);
      this.setBudget(maxBytes);
    }

    if (this.pool.totalBytes > maxBytes) {
      this.report(new RangeError("Unable to satisfy the texture budget after releasing visible slots."));
    }
  }

  private commitFallback(version: number, slots: Array<T | null>): void {
    if (this.disposed || version !== this.generation) return;
    try {
      this.onCommit(slots);
    } catch (error) {
      this.report(error);
    }
    const oldVisibleResources = this.visibleResources;
    this.visibleResources = [];
    this.releaseMany(oldVisibleResources.map((resource) => resource.lease));
    this.retain([]);
  }

  private commitSlots(
    version: number,
    slots: Array<T | null>,
    candidates: MorphCandidate[],
    stagedLease: TextureLease,
  ): void {
    if (this.disposed || version !== this.generation) return;
    const successful = candidates.filter((candidate) => slots[candidate.index] !== null);
    const successfulUrls = successful.map((candidate) => candidate.url);
    const nextVisibleResources: VisibleResource[] = [];
    if (successfulUrls.length > 0) {
      try {
        for (const candidate of successful) {
          nextVisibleResources.push({ ...candidate, lease: this.pool.pin([candidate.url]) });
        }
      } catch (error) {
        for (const candidate of successful) slots[candidate.index] = null;
        successfulUrls.length = 0;
        this.releaseMany(nextVisibleResources.map((resource) => resource.lease));
        nextVisibleResources.length = 0;
        this.report(error);
      }
    }

    try {
      this.onCommit(slots);
    } catch (error) {
      this.report(error);
    }

    const oldVisibleResources = this.visibleResources;
    this.visibleResources = nextVisibleResources;
    this.backgroundLease = stagedLease;
    if (this.stagedLease === stagedLease) this.stagedLease = null;
    this.releaseMany(oldVisibleResources.map((resource) => resource.lease));
    this.retain(candidates.map((candidate) => candidate.url));
  }

  private scheduleIdle(version: number, candidates: MorphCandidate[], slots: Array<T | null>): void {
    if (this.disposed || version !== this.generation || candidates.length === 0) return;
    this.idleTask = this.idleScheduler.request(() => {
      this.idleTask = null;
      if (this.disposed || version !== this.generation) return;
      const [candidate, ...remaining] = candidates;
      try {
        void this.pool.acquire(candidate.url).then(
          (value) => {
            if (this.disposed || version !== this.generation) return;
            slots[candidate.index] = value;
            this.update(candidate, value);
          },
          () => undefined,
        );
      } catch {
        // Invalidated or disposed pools make the slot remain an ink frame.
      }
      this.scheduleIdle(version, remaining, slots);
    });
  }

  private update(candidate: MorphCandidate, value: T | null): void {
    let lease: TextureLease;
    try {
      lease = this.pool.pin([candidate.url]);
    } catch (error) {
      this.report(error);
      return;
    }
    try {
      this.onUpdate(candidate.index, value);
    } catch (error) {
      this.report(error);
    }
    this.visibleResources.push({ ...candidate, lease });
  }

  private finishCurrent(): void {
    const settle = this.settleCurrent;
    this.settleCurrent = null;
    settle?.();
  }

  private cancelIdle(): void {
    if (this.idleTask === null) return;
    const task = this.idleTask;
    this.idleTask = null;
    try {
      this.idleScheduler.cancel(task);
    } catch (error) {
      this.report(error);
    }
  }

  private release(lease: TextureLease | null): void {
    if (!lease) return;
    try {
      lease.release();
    } catch (error) {
      this.report(error);
    }
  }

  private releaseMany(leases: TextureLease[]): void {
    for (const lease of leases) this.release(lease);
  }

  private retain(urls: string[]): void {
    try {
      this.pool.retain(urls);
    } catch (error) {
      this.report(error);
    }
  }

  private setBudget(maxBytes: number): void {
    try {
      this.pool.setMaxBytes(maxBytes);
    } catch (error) {
      this.report(error);
    }
  }

  private report(error: unknown): void {
    try {
      this.onError(error);
    } catch {
      // Error reporting must not break ownership transitions.
    }
  }
}

const TIER_LIMITS: Record<RenderedTier, { dpr: number; planes: number; textureBytes: number }> = {
  high: { dpr: 1.5, planes: 10, textureBytes: 48 * 1024 * 1024 },
  medium: { dpr: 1.25, planes: 6, textureBytes: 24 * 1024 * 1024 },
};

type CloseableImage = { width: number; height: number; close?: () => void };

function createTexturePool(tier: RenderedTier): TexturePool<THREE.Texture> {
  return new TexturePool({
    maxBytes: TIER_LIMITS[tier].textureBytes,
    async load(url, signal) {
      const response = await fetch(url, { signal, credentials: "same-origin" });
      if (!response.ok) throw new Error(`Texture request failed with status ${response.status}.`);
      const image = await createImageBitmap(await response.blob());
      if (signal.aborted) {
        image.close();
        throw new DOMException("Texture load was aborted.", "AbortError");
      }
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return { value: texture, width: image.width, height: image.height, bytes: image.width * image.height * 4 };
    },
    dispose(texture) {
      texture.dispose();
      (texture.image as CloseableImage | undefined)?.close?.();
    },
  });
}

export class ThreeSceneDriver implements SceneDriver {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly root = new THREE.Group();
  private readonly contactSheet = createContactSheetGroup(TIER_LIMITS.high.planes);
  private readonly focusRails = createFocusRailGroup();
  private readonly shutter = createShutterGroup();
  private readonly resources = new ResourceRegistry();
  private readonly texturePool: TexturePool<THREE.Texture>;
  private readonly morphCoordinator: TextureMorphCoordinator<THREE.Texture>;
  private readonly onError: (error: unknown) => void;
  private tierValue: RenderedTier;
  private currentPreset: ScenePreset | null = null;
  private currentUrls: string[] = [];
  private suspended = false;
  private disposed = false;

  constructor(options: ThreeSceneDriverOptions) {
    this.tierValue = options.tier;
    this.onError = options.onError ?? ((error) => console.error("Immersive scene driver error.", error));
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x111412, 0);
    this.texturePool = options.texturePool ?? createTexturePool(options.tier);
    this.morphCoordinator = new TextureMorphCoordinator({
      pool: this.texturePool,
      idleScheduler: options.idleScheduler ?? createDefaultIdleScheduler(),
      onCommit: (slots) => this.applyTextures(this.contactPlanes(), slots, slots.length),
      onUpdate: (index, value) => this.applyTexture(this.contactPlanes(), index, value),
      onError: (error) => this.report(error),
    });

    this.resources.register(this.renderer);
    this.resources.register(this.texturePool);
    this.resources.register(this.contactSheet, disposeOpticalGroup);
    this.resources.register(this.focusRails, disposeOpticalGroup);
    this.resources.register(this.shutter, disposeOpticalGroup);

    this.root.add(this.contactSheet, this.focusRails, this.shutter);
    this.scene.add(this.root);
    this.camera.position.z = 6;
    this.applyRendererTier();
    this.applyTextureBudget();
  }

  setTier(tier: RenderedTier): void {
    if (this.disposed || this.tierValue === tier) return;
    this.tierValue = tier;
    this.applyRendererTier();
    if (this.currentPreset) {
      void this.morphTo(this.currentPreset, this.currentUrls).then(
        () => this.applyTextureBudget(),
        (error) => this.report(error),
      );
    } else {
      this.applyTextureBudget();
    }
  }

  setSize(width: number, height: number): void {
    if (this.disposed) return;
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(safeWidth, safeHeight, false);
  }

  morphTo(preset: ScenePreset, imageUrls: string[]): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const planeLimit = Math.min(TIER_LIMITS[this.tierValue].planes, preset.maxPlanes[this.tierValue]);
    this.currentPreset = preset;
    this.currentUrls = [...imageUrls];
    this.focusRails.visible = preset.composition === "focus" || preset.composition === "calibration";
    this.shutter.visible = preset.composition === "shutter";
    applyPresetGeometry(this.contactSheet, preset, 0);
    this.camera.position.z = preset.cameraZ;
    return this.morphCoordinator.morph(imageUrls, planeLimit);
  }

  render(frame: SceneFrame): void {
    if (this.disposed || this.suspended) return;
    const seconds = frame.time / 1000;
    this.root.rotation.y = frame.pointerX * 0.035;
    this.root.rotation.x = frame.pointerY * 0.022;
    this.root.position.y = (frame.scrollProgress - 0.5) * 0.18 + Math.sin(seconds * 0.22) * 0.025;
    if (this.currentPreset) applyPresetGeometry(this.contactSheet, this.currentPreset, frame.scrollProgress);
    this.renderer.render(this.scene, this.camera);
  }

  suspend(): void {
    this.suspended = true;
  }

  resume(): void {
    if (!this.disposed) this.suspended = false;
  }

  async samplePixels(): Promise<Uint8Array> {
    if (this.disposed) return new Uint8Array();
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const pixels = new Uint8Array(size.x * size.y * 4);
    const context = this.renderer.getContext();
    context.readPixels(0, 0, size.x, size.y, context.RGBA, context.UNSIGNED_BYTE, pixels);
    return pixels;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.root);
    this.morphCoordinator.dispose();
    this.resources.dispose();
  }

  private applyRendererTier(): void {
    const limits = TIER_LIMITS[this.tierValue];
    const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(deviceDpr, limits.dpr));
  }

  private applyTextureBudget(): void {
    this.morphCoordinator.enforceBudget(TIER_LIMITS[this.tierValue].textureBytes);
  }

  private contactPlanes(): Array<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>> {
    return this.contactSheet.children.filter(
      (child): child is THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> => child instanceof THREE.Mesh,
    );
  }

  private applyTextures(
    planes: Array<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>,
    textures: ReadonlyArray<THREE.Texture | null>,
    count: number,
  ): void {
    planes.forEach((plane, index) => {
      const visible = index < count;
      plane.visible = visible;
      if (!visible) return;
      plane.material.map = textures[index] ?? null;
      plane.material.color.setHex(textures[index] ? 0xffffff : 0x171a18);
      plane.material.needsUpdate = true;
    });
  }

  private applyTexture(
    planes: Array<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>,
    index: number,
    texture: THREE.Texture | null,
  ): void {
    const plane = planes[index];
    if (!plane) return;
    plane.visible = true;
    plane.material.map = texture;
    plane.material.color.setHex(texture ? 0xffffff : 0x171a18);
    plane.material.needsUpdate = true;
  }

  private report(error: unknown): void {
    try {
      this.onError(error);
    } catch {
      // Reporting is deliberately non-fatal to renderer ownership.
    }
  }
}

export function createThreeSceneDriver(options: ThreeSceneDriverOptions): SceneDriver {
  return new ThreeSceneDriver(options);
}
