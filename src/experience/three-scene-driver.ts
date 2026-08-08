import * as THREE from "three";
import type { ExperienceTier } from "./capability-tier";
import {
  applyPresetGeometry,
  createContactSheetGroup,
  createCoordinateMarkerGroup,
  createFocusRailGroup,
  createShutterGroup,
  disposeOpticalGroup,
  presetUsesCoordinateMarkers,
  presetUsesFocusRails,
} from "./optical-geometry";
import { ResourceRegistry } from "./resource-registry";
import type { ScenePreset } from "./scene-presets";
import { isPublicPhotoImagePath, TexturePool } from "./texture-pool";
import { TextureMorphCoordinator } from "./texture-morph-coordinator";
import { createDefaultIdleScheduler, type IdleScheduler } from "./texture-morph-support";
import { configureFlowMaterial, getFlowUniforms, resolveFlowEnergy } from "./flow-material";
import { createTextureBitmap, type CloseableImage } from "./texture-image-decoder";

export { TextureBudgetEnforcementError } from "./texture-morph-support";
export type { IdleScheduler } from "./texture-morph-support";
export { TextureMorphCoordinator } from "./texture-morph-coordinator";
export { resolveFlowEnergy } from "./flow-material";
export { createTextureBitmap } from "./texture-image-decoder";

type RenderedTier = Exclude<ExperienceTier, "static">;

export type SceneFrame = {
  time: number;
  delta: number;
  pointerX: number;
  pointerY: number;
  scrollProgress: number;
};

export type SceneDriver = {
  readonly textureBytes: number;
  setTier(tier: RenderedTier): void;
  setSize(width: number, height: number): void;
  setHighlightedId(id: string | null): void;
  releaseTransientTextures(): void;
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

const TIER_LIMITS: Record<RenderedTier, { dpr: number; planes: number; textureBytes: number; textureDimension: number }> = {
  high: { dpr: 1.5, planes: 10, textureBytes: 48 * 1024 * 1024, textureDimension: 1280 },
  medium: { dpr: 1.25, planes: 2, textureBytes: 24 * 1024 * 1024, textureDimension: 960 },
};

export function validateTextureResponse(
  requestedUrl: string,
  response: Pick<Response, "ok" | "redirected" | "url" | "headers">,
): string {
  if (!response.ok) throw new Error("Texture request did not return a successful response.");
  if (response.redirected) throw new Error("Texture requests must not follow redirects.");

  const requested = new URL(requestedUrl);
  let received: URL;
  try {
    received = new URL(response.url);
  } catch {
    throw new TypeError("Texture response URL must be present and same-origin.");
  }
  if (received.origin !== requested.origin) throw new TypeError("Texture response URL must remain same-origin.");

  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  const supportedStaticType = contentType === "image/avif" || contentType === "image/webp";
  const supportedUploadedType = isPublicPhotoImagePath(requested.pathname)
    && (supportedStaticType || contentType === "image/jpeg" || contentType === "image/png");
  if (!supportedStaticType && !supportedUploadedType) {
    throw new TypeError("Texture response Content-Type is not supported for this resource.");
  }
  return contentType;
}

function createTexturePool(tier: RenderedTier): TexturePool<THREE.Texture> {
  return new TexturePool({
    maxBytes: TIER_LIMITS[tier].textureBytes,
    async load(url, signal) {
      const response = await fetch(url, { signal, credentials: "same-origin" });
      const contentType = validateTextureResponse(url, response);
      const source = await response.blob();
      const uploadedPhoto = isPublicPhotoImagePath(new URL(url).pathname);
      const image = await createTextureBitmap(source, uploadedPhoto
        ? { contentType, maxDimension: TIER_LIMITS[tier].textureDimension }
        : undefined);
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

export function resolveCameraDepth(preset: ScenePreset, scrollProgress: number): number {
  const progress = Number.isFinite(scrollProgress) ? Math.min(1, Math.max(0, scrollProgress)) : 0;
  const easedProgress = progress * progress * (3 - 2 * progress);
  const travel = Math.min(0.9, Math.max(0.2, preset.depth * 0.035));
  return preset.cameraZ - travel * easedProgress;
}

export function resolveHighlightedPlaneIndex(id: string, planeCount: number): number | null {
  const count = Math.max(0, Math.floor(planeCount));
  if (count === 0 || id === "") return null;
  let hash = 2166136261;
  for (const character of id.slice(0, 256)) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % count;
}

export class ThreeSceneDriver implements SceneDriver {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly root = new THREE.Group();
  private readonly contactSheet = createContactSheetGroup(TIER_LIMITS.high.planes);
  private readonly focusRails = createFocusRailGroup();
  private readonly coordinateMarkers = createCoordinateMarkerGroup();
  private readonly shutter = createShutterGroup();
  private readonly resources = new ResourceRegistry();
  private readonly texturePool: TexturePool<THREE.Texture>;
  private readonly morphCoordinator: TextureMorphCoordinator<THREE.Texture>;
  private readonly onError: (error: unknown) => void;
  private readonly flowVelocity = new THREE.Vector2();
  private readonly flowTargetVelocity = new THREE.Vector2();
  private readonly previousPointer = new THREE.Vector2();
  private tierValue: RenderedTier;
  private currentPreset: ScenePreset | null = null;
  private currentUrls: string[] = [];
  private highlightedId: string | null = null;
  private previousScrollProgress = 0;
  private flowEnergy = 0;
  private hasFlowFrame = false;
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
    this.contactPlanes().forEach((plane) => configureFlowMaterial(plane.material));
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
    this.resources.register(this.coordinateMarkers, disposeOpticalGroup);
    this.resources.register(this.shutter, disposeOpticalGroup);

    this.root.add(this.contactSheet, this.focusRails, this.coordinateMarkers, this.shutter);
    this.scene.add(this.root);
    this.camera.position.z = 6;
    this.applyRendererTier();
    this.applyTextureBudget();
  }

  setTier(tier: RenderedTier): void {
    if (this.disposed || this.tierValue === tier) return;
    this.tierValue = tier;
    this.applyRendererTier();
    this.applyTextureBudget();
    if (this.currentPreset) {
      void this.morphTo(this.currentPreset, this.currentUrls).catch((error: unknown) => this.report(error));
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

  get textureBytes(): number {
    return this.texturePool.totalBytes;
  }

  setHighlightedId(id: string | null): void {
    if (this.disposed) return;
    this.highlightedId = id && id.trim() !== "" ? id : null;
    this.applyHighlightState();
  }

  releaseTransientTextures(): void {
    if (this.disposed) return;
    this.currentUrls = [];
    this.highlightedId = null;
    this.morphCoordinator.releaseTransientTextures();
  }

  morphTo(preset: ScenePreset, imageUrls: string[]): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const planeLimit = Math.min(TIER_LIMITS[this.tierValue].planes, preset.maxPlanes[this.tierValue]);
    if (this.currentPreset?.id !== preset.id) {
      this.flowEnergy = 0;
      this.flowVelocity.set(0, 0);
      this.hasFlowFrame = false;
    }
    this.currentPreset = preset;
    this.currentUrls = [...imageUrls];
    this.focusRails.visible = presetUsesFocusRails(preset);
    this.coordinateMarkers.visible = presetUsesCoordinateMarkers(preset);
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
    if (this.currentPreset) {
      const resolvedDepth = resolveCameraDepth(this.currentPreset, frame.scrollProgress);
      this.camera.position.z = this.tierValue === "medium"
        ? this.currentPreset.cameraZ + (resolvedDepth - this.currentPreset.cameraZ) * 0.55
        : resolvedDepth;
      applyPresetGeometry(this.contactSheet, this.currentPreset, frame.scrollProgress);
      this.applyHighlightState();
    }
    this.updateFlow(frame, seconds);
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

  private applyHighlightState(): void {
    const planes = this.contactPlanes().filter((plane) => plane.visible);
    const highlightedIndex = this.highlightedId
      ? resolveHighlightedPlaneIndex(this.highlightedId, planes.length)
      : null;
    planes.forEach((plane, index) => {
      const selected = highlightedIndex === index;
      const emphasis = highlightedIndex === null ? 1 : selected ? 1.055 : 0.97;
      const baseScaleX = Number(plane.userData.opticalBaseScaleX) || 1;
      const baseScaleY = Number(plane.userData.opticalBaseScaleY) || 1;
      plane.scale.set(baseScaleX * emphasis, baseScaleY * emphasis, emphasis);
    });
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
      this.updateTextureAspect(plane.material, textures[index] ?? null);
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
    this.updateTextureAspect(plane.material, texture);
  }

  private updateFlow(frame: SceneFrame, seconds: number): void {
    const pointerDeltaX = this.hasFlowFrame ? frame.pointerX - this.previousPointer.x : 0;
    const pointerDeltaY = this.hasFlowFrame ? frame.pointerY - this.previousPointer.y : 0;
    const scrollDelta = this.hasFlowFrame ? frame.scrollProgress - this.previousScrollProgress : 0;
    const frameRatio = Math.min(3, Math.max(0.25, frame.delta / (1000 / 60)));
    this.flowTargetVelocity.set(pointerDeltaX, -pointerDeltaY).multiplyScalar(6.4);
    const velocityIsRising = this.flowTargetVelocity.lengthSq() > this.flowVelocity.lengthSq();
    const velocityBlend = 1 - Math.pow(velocityIsRising ? 0.62 : 0.92, frameRatio);
    this.flowVelocity.lerp(this.flowTargetVelocity, velocityBlend);

    const targetEnergy = resolveFlowEnergy(pointerDeltaX, pointerDeltaY, scrollDelta);
    const energyBlend = 1 - Math.pow(targetEnergy > this.flowEnergy ? 0.62 : 0.975, frameRatio);
    this.flowEnergy += (targetEnergy - this.flowEnergy) * energyBlend;
    this.previousPointer.set(frame.pointerX, frame.pointerY);
    this.previousScrollProgress = frame.scrollProgress;
    this.hasFlowFrame = true;

    const isHome = this.currentPreset?.id === "home";
    const pointerX = Math.min(1, Math.max(0, (frame.pointerX + 1) * 0.5));
    const pointerY = Math.min(1, Math.max(0, (1 - frame.pointerY) * 0.5));
    this.contactPlanes().forEach((plane, index) => {
      const uniforms = getFlowUniforms(plane.material);
      if (!uniforms) return;
      uniforms.time.value = seconds;
      uniforms.pointer.value.set(pointerX, pointerY);
      uniforms.velocity.value.copy(this.flowVelocity);
      uniforms.strength.value = isHome ? (0.38 + this.flowEnergy * 1.45) * (index === 0 ? 0.88 : 1) : 0;
      uniforms.scroll.value = isHome ? frame.scrollProgress : 0;
      uniforms.planeAspect.value = 1.5 * Math.abs(plane.scale.x / Math.max(0.001, plane.scale.y));
    });
  }

  private updateTextureAspect(material: THREE.MeshBasicMaterial, texture: THREE.Texture | null): void {
    const uniforms = getFlowUniforms(material);
    const image = texture?.image as Partial<CloseableImage> | undefined;
    if (!uniforms || !image?.width || !image.height) return;
    uniforms.imageAspect.value = image.width / image.height;
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
