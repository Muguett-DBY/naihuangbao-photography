import * as THREE from "three";
import type { ExperienceTier } from "./capability-tier";
import { applyPresetGeometry, createContactSheetGroup, createFocusRailGroup, createShutterGroup, disposeOpticalGroup } from "./optical-geometry";
import { ResourceRegistry } from "./resource-registry";
import type { ScenePreset } from "./scene-presets";
import { TexturePool } from "./texture-pool";

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
};

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
  private tierValue: RenderedTier;
  private currentPreset: ScenePreset | null = null;
  private currentUrls: string[] = [];
  private morphVersion = 0;
  private suspended = false;
  private disposed = false;

  constructor(options: ThreeSceneDriverOptions) {
    this.tierValue = options.tier;
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

    this.resources.register(this.renderer);
    this.resources.register(this.texturePool);
    this.resources.register(this.contactSheet, disposeOpticalGroup);
    this.resources.register(this.focusRails, disposeOpticalGroup);
    this.resources.register(this.shutter, disposeOpticalGroup);

    this.root.add(this.contactSheet, this.focusRails, this.shutter);
    this.scene.add(this.root);
    this.camera.position.z = 6;
    this.applyTierLimits();
  }

  setTier(tier: RenderedTier): void {
    if (this.disposed || this.tierValue === tier) return;
    this.tierValue = tier;
    this.applyTierLimits();
    if (this.currentPreset) void this.morphTo(this.currentPreset, this.currentUrls);
  }

  setSize(width: number, height: number): void {
    if (this.disposed) return;
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(safeWidth, safeHeight, false);
  }

  async morphTo(preset: ScenePreset, imageUrls: string[]): Promise<void> {
    if (this.disposed) return;
    const version = ++this.morphVersion;
    const planeLimit = Math.min(TIER_LIMITS[this.tierValue].planes, preset.maxPlanes[this.tierValue]);
    const desiredUrls = imageUrls.slice(0, planeLimit);
    this.currentPreset = preset;
    this.currentUrls = [...imageUrls];
    this.texturePool.retain(desiredUrls);
    this.focusRails.visible = preset.composition === "focus" || preset.composition === "calibration";
    this.shutter.visible = preset.composition === "shutter";
    applyPresetGeometry(this.contactSheet, preset, 0);
    this.camera.position.z = preset.cameraZ;

    const planes = this.contactPlanes();
    const currentlyVisible = planes.filter((plane) => plane.visible).length;
    if (desiredUrls.length === 0) {
      if (currentlyVisible === 0 && planeLimit > 0) this.applyTextures(planes, [null], 1);
      return;
    }

    const textures = await Promise.all(desiredUrls.map(async (url) => {
      try {
        return await this.texturePool.acquire(url);
      } catch {
        return null;
      }
    }));
    if (this.disposed || version !== this.morphVersion) return;

    if (textures.some((texture) => texture !== null)) {
      this.applyTextures(planes, textures, desiredUrls.length);
    } else if (currentlyVisible === 0) {
      this.applyTextures(planes, textures, desiredUrls.length);
    }
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
    this.morphVersion += 1;
    this.scene.remove(this.root);
    this.resources.dispose();
  }

  private applyTierLimits(): void {
    const limits = TIER_LIMITS[this.tierValue];
    const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(deviceDpr, limits.dpr));
    this.texturePool.setMaxBytes(limits.textureBytes);
    const presetLimit = this.currentPreset?.maxPlanes[this.tierValue] ?? limits.planes;
    const visibleLimit = Math.min(limits.planes, presetLimit);
    this.contactPlanes().forEach((plane, index) => {
      if (index >= visibleLimit) plane.visible = false;
    });
  }

  private contactPlanes(): Array<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>> {
    return this.contactSheet.children.filter(
      (child): child is THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> => child instanceof THREE.Mesh,
    );
  }

  private applyTextures(
    planes: Array<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>,
    textures: Array<THREE.Texture | null>,
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
}

export function createThreeSceneDriver(options: ThreeSceneDriverOptions): SceneDriver {
  return new ThreeSceneDriver(options);
}
