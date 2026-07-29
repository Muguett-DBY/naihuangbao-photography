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
import { isPublicPhotoImagePath, TexturePool, type TextureLease } from "./texture-pool";

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

type IdleWork<T> = {
  version: number;
  candidates: MorphCandidate[];
  slots: Array<T | null>;
  onReady(candidate: MorphCandidate, value: T): void;
};

type CommitResult =
  | { committed: true }
  | { committed: false; error: unknown; preservesStagedLeases: boolean };

type MorphSettlement = {
  resolve(): void;
  reject(error: unknown): void;
};

type ConservativeLease = {
  lease: TextureLease;
  resources: VisibleResource[];
};

export class TextureBudgetEnforcementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextureBudgetEnforcementError";
  }
}

function isBudgetAdmissionFailure(error: unknown): boolean {
  if (error instanceof RangeError) return true;
  return error instanceof AggregateError && error.errors.some((entry) => entry instanceof RangeError);
}

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
  private idleWork: IdleWork<T> | null = null;
  private stagedLease: TextureLease | null = null;
  private backgroundLease: TextureLease | null = null;
  private visibleResources: VisibleResource[] = [];
  private conservativeLeases: ConservativeLease[] = [];
  private settleCurrent: MorphSettlement | null = null;
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
    this.idleWork = null;
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
      const result = this.commitFallback(version, slots);
      return result.committed ? Promise.resolve() : Promise.reject(result.error);
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
      const result = this.commitFallback(version, slots);
      return result.committed ? Promise.resolve() : Promise.reject(result.error);
    }

    return new Promise<void>((resolve, reject) => {
      this.settleCurrent = { resolve, reject };
      const critical = candidates.slice(0, 3);
      let completedCritical = 0;
      let committed = false;
      let budgetHandedOff = false;

      const rejectMorph = (error: unknown, releaseStagedLease: boolean) => {
        if (version !== this.generation) return;
        this.generation += 1;
        this.cancelIdle();
        this.idleWork = null;
        if (releaseStagedLease) this.releaseStagedLease(stagedLease);
        this.retain(this.visibleResources.map((resource) => resource.url));
        this.rejectCurrent(error);
      };

      const handoffForBudget = () => {
        if (budgetHandedOff || this.visibleResources.length === 0) return true;
        const inkSlots = slots.map(() => null);
        const result = this.commitFallback(version, inkSlots, candidateUrls, true);
        if (!result.committed) {
          rejectMorph(result.error, !result.preservesStagedLeases);
          return false;
        }
        budgetHandedOff = true;
        return true;
      };

      const commit = () => {
        if (committed || this.disposed || version !== this.generation) return;
        committed = true;
        const hasTexture = slots.some((slot) => slot !== null);
        const result = hasTexture
          ? this.commitSlots(version, slots, candidates, stagedLease)
          : this.commitFallback(version, slots);
        if (!result.committed) {
          rejectMorph(result.error, !result.preservesStagedLeases);
          return;
        }
        else if (!hasTexture) this.releaseStagedLease(stagedLease);
        this.finishCurrent();
      };

      const receiveTexture = (candidate: MorphCandidate, value: T) => {
        if (this.disposed || version !== this.generation) return;
        slots[candidate.index] = value;
        if (!committed) commit();
        else this.update(candidate, value);
      };

      this.beginIdleWork(version, candidates.slice(3), slots, receiveTexture);

      const visibleBytes = this.pool.bytesFor(this.visibleResources.map((resource) => resource.url));
      if (visibleBytes >= this.pool.maxBytes && !handoffForBudget()) {
        this.finishCurrent();
        return;
      }

      const acquireCritical = (candidate: MorphCandidate) => {
        let pending: Promise<T>;
        try {
          pending = this.pool.acquire(candidate.url);
        } catch {
          completedCritical += 1;
          if (completedCritical === critical.length) commit();
          return;
        }

        void pending.then(
          (value) => {
            receiveTexture(candidate, value);
          },
          (error: unknown) => {
            if (this.disposed || version !== this.generation) return;
            if (!budgetHandedOff && isBudgetAdmissionFailure(error) && handoffForBudget()) {
              acquireCritical(candidate);
              return;
            }
            completedCritical += 1;
            if (!committed && completedCritical === critical.length) commit();
          },
        );
      };

      for (const candidate of critical) acquireCritical(candidate);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.finishCurrent();
    this.cancelIdle();
    this.idleWork = null;
    this.release(this.stagedLease);
    this.release(this.backgroundLease);
    this.releaseMany(this.visibleResources.map((resource) => resource.lease));
    this.releaseConservativeLeases();
    this.stagedLease = null;
    this.backgroundLease = null;
    this.visibleResources = [];
    this.retain([]);
  }

  enforceBudget(maxBytes: number): void {
    if (this.disposed) return;
    this.cancelIdle();
    this.release(this.backgroundLease);
    this.backgroundLease = null;
    this.retain(this.visibleResources.map((resource) => resource.url));
    this.clearConservativeBudgetOwnership();
    this.setBudget(maxBytes);

    while (this.pool.totalBytes > maxBytes && this.visibleResources.length > 0) {
      const resource = this.visibleResources.at(-1);
      if (!resource) break;
      try {
        this.onUpdate(resource.index, null);
      } catch (error) {
        this.report(error);
        break;
      }
      this.visibleResources.pop();
      this.release(resource.lease);
      this.setBudget(maxBytes);
    }

    if (this.pool.totalBytes > maxBytes) {
      this.report(new RangeError("Unable to satisfy the texture budget after releasing visible slots."));
    }
    this.requestIdleWork();
  }

  releaseTransientTextures(): void {
    if (this.disposed) return;
    this.generation += 1;
    this.finishCurrent();
    this.cancelIdle();
    this.idleWork = null;

    const commit = this.callCommit([]);
    if (!commit.committed) {
      this.report(commit.error);
      return;
    }

    const stagedLease = this.stagedLease;
    const backgroundLease = this.backgroundLease;
    const visibleLeases = this.visibleResources.map((resource) => resource.lease);
    this.stagedLease = null;
    this.backgroundLease = null;
    this.visibleResources = [];
    this.release(stagedLease);
    this.release(backgroundLease);
    this.releaseMany(visibleLeases);
    this.releaseConservativeLeases();
    this.discardUnretained([]);
  }

  private commitFallback(
    version: number,
    slots: Array<T | null>,
    retainedUrls: string[] = [],
    discardUnretained = false,
  ): CommitResult {
    if (this.disposed || version !== this.generation) {
      return { committed: false, error: new Error("Texture morph is no longer active."), preservesStagedLeases: false };
    }
    const commit = this.callCommit(slots);
    if (!commit.committed) return commit;
    const oldVisibleResources = this.visibleResources;
    this.visibleResources = [];
    this.releaseMany(oldVisibleResources.map((resource) => resource.lease));
    this.releaseConservativeLeases();
    this.retain(retainedUrls);
    if (discardUnretained) this.discardUnretained(retainedUrls);
    return { committed: true };
  }

  private commitSlots(
    version: number,
    slots: Array<T | null>,
    candidates: MorphCandidate[],
    stagedLease: TextureLease,
  ): CommitResult {
    if (this.disposed || version !== this.generation) {
      return { committed: false, error: new Error("Texture morph is no longer active."), preservesStagedLeases: false };
    }
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

    const commit = this.callCommit(slots);
    if (!commit.committed) {
      this.preserveStagedLease(stagedLease, nextVisibleResources);
      this.preserveResourceLeases(nextVisibleResources);
      return { ...commit, preservesStagedLeases: true };
    }

    const oldVisibleResources = this.visibleResources;
    this.visibleResources = nextVisibleResources;
    this.backgroundLease = stagedLease;
    if (this.stagedLease === stagedLease) this.stagedLease = null;
    this.releaseMany(oldVisibleResources.map((resource) => resource.lease));
    this.releaseConservativeLeases();
    this.retain(candidates.map((candidate) => candidate.url));
    return { committed: true };
  }

  private beginIdleWork(
    version: number,
    candidates: MorphCandidate[],
    slots: Array<T | null>,
    onReady: IdleWork<T>["onReady"],
  ): void {
    if (candidates.length === 0) return;
    this.idleWork = { version, candidates: [...candidates], slots, onReady };
    this.requestIdleWork();
  }

  private requestIdleWork(): void {
    const work = this.idleWork;
    if (!work || this.idleTask !== null || this.disposed || work.version !== this.generation || work.candidates.length === 0) return;
    this.idleTask = this.idleScheduler.request(() => {
      this.idleTask = null;
      if (this.disposed || work !== this.idleWork || work.version !== this.generation) return;
      const candidate = work.candidates.shift();
      if (!candidate) return;
      try {
        void this.pool.acquire(candidate.url).then(
          (value) => {
            if (this.disposed || work !== this.idleWork || work.version !== this.generation) return;
            work.slots[candidate.index] = value;
            work.onReady(candidate, value);
          },
          () => undefined,
        );
      } catch {
        // Invalidated or disposed pools make the slot remain an ink frame.
      }
      this.requestIdleWork();
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
    settle?.resolve();
  }

  private rejectCurrent(error: unknown): void {
    const settle = this.settleCurrent;
    this.settleCurrent = null;
    settle?.reject(error);
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

  private releaseStagedLease(lease: TextureLease): void {
    if (this.stagedLease === lease) this.stagedLease = null;
    this.release(lease);
  }

  private preserveStagedLease(lease: TextureLease, resources: VisibleResource[]): void {
    if (this.stagedLease === lease) this.stagedLease = null;
    this.conservativeLeases.push({ lease, resources: [...resources] });
  }

  private preserveResourceLeases(resources: VisibleResource[]): void {
    for (const resource of resources) this.conservativeLeases.push({ lease: resource.lease, resources: [resource] });
  }

  private releaseConservativeLeases(): void {
    const leases = this.conservativeLeases;
    this.conservativeLeases = [];
    this.releaseMany(leases.map((entry) => entry.lease));
  }

  private clearConservativeBudgetOwnership(): void {
    if (this.conservativeLeases.length === 0) return;
    const resources = new Map<number, VisibleResource>();
    for (const entry of this.conservativeLeases) {
      for (const resource of entry.resources) resources.set(resource.index, resource);
    }

    try {
      for (const resource of resources.values()) this.onUpdate(resource.index, null);
    } catch {
      throw new TextureBudgetEnforcementError("Unable to clear conservatively retained texture slots for the new byte budget.");
    }

    this.releaseConservativeLeases();
    this.discardUnretained(this.visibleResources.map((resource) => resource.url));
  }

  private callCommit(slots: ReadonlyArray<T | null>): CommitResult {
    try {
      this.onCommit(slots);
      return { committed: true };
    } catch (error) {
      return { committed: false, error, preservesStagedLeases: false };
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

  private discardUnretained(urls: string[]): void {
    try {
      this.pool.discardUnretained(urls);
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

const TIER_LIMITS: Record<RenderedTier, { dpr: number; planes: number; textureBytes: number; textureDimension: number }> = {
  high: { dpr: 1.5, planes: 10, textureBytes: 48 * 1024 * 1024, textureDimension: 1280 },
  medium: { dpr: 1.25, planes: 6, textureBytes: 24 * 1024 * 1024, textureDimension: 960 },
};

type CloseableImage = { width: number; height: number; close?: () => void };

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

type TextureBitmapFactory = (source: Blob, options: ImageBitmapOptions) => Promise<ImageBitmap>;

type TextureBitmapOptions = {
  contentType?: string;
  factory?: TextureBitmapFactory;
  maxDimension?: number;
};

type EncodedImageDimensions = {
  width: number;
  height: number;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);
const MAX_DIMENSION_HEADER_BYTES = 1024 * 1024;
const MAX_DIMENSION_HEADER_SEGMENTS = 256;

function invalidTextureDimensions(): TypeError {
  return new TypeError("Texture dimensions could not be read from the encoded image.");
}

async function readBlobBytes(source: Blob, offset: number, length: number): Promise<Uint8Array> {
  const end = offset + length;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || !Number.isSafeInteger(end)
    || offset < 0 || length < 1 || end > source.size) {
    throw invalidTextureDimensions();
  }
  return new Uint8Array(await source.slice(offset, end).arrayBuffer());
}

function bytesEqual(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function checkedDimensions(width: number, height: number): EncodedImageDimensions {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw invalidTextureDimensions();
  }
  return { width, height };
}

async function readPngDimensions(source: Blob): Promise<EncodedImageDimensions> {
  const header = await readBlobBytes(source, 0, 24);
  if (!bytesEqual(header, PNG_SIGNATURE) || ascii(header, 12, 4) !== "IHDR") {
    throw invalidTextureDimensions();
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  return checkedDimensions(view.getUint32(16), view.getUint32(20));
}

async function readJpegDimensions(source: Blob): Promise<EncodedImageDimensions> {
  const signature = await readBlobBytes(source, 0, 2);
  if (signature[0] !== 0xff || signature[1] !== 0xd8) throw invalidTextureDimensions();

  let offset = 2;
  let segmentCount = 0;
  while (offset < source.size && offset < MAX_DIMENSION_HEADER_BYTES) {
    segmentCount += 1;
    if (segmentCount > MAX_DIMENSION_HEADER_SEGMENTS) throw invalidTextureDimensions();
    const prefix = await readBlobBytes(source, offset, 1);
    if (prefix[0] !== 0xff) throw invalidTextureDimensions();

    let marker = 0xff;
    while (marker === 0xff) {
      offset += 1;
      if (offset >= MAX_DIMENSION_HEADER_BYTES) throw invalidTextureDimensions();
      marker = (await readBlobBytes(source, offset, 1))[0] ?? 0;
    }
    offset += 1;

    if (marker === 0x00 || marker === 0xd9 || marker === 0xda) throw invalidTextureDimensions();
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const segmentHeader = await readBlobBytes(source, offset, 2);
    const segmentLength = (segmentHeader[0] << 8) | segmentHeader[1];
    if (segmentLength < 2 || offset + segmentLength > source.size) throw invalidTextureDimensions();

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) throw invalidTextureDimensions();
      const frameHeader = await readBlobBytes(source, offset, 7);
      const height = (frameHeader[3] << 8) | frameHeader[4];
      const width = (frameHeader[5] << 8) | frameHeader[6];
      return checkedDimensions(width, height);
    }
    offset += segmentLength;
  }
  throw invalidTextureDimensions();
}

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

async function readWebpDimensions(source: Blob): Promise<EncodedImageDimensions> {
  const header = await readBlobBytes(source, 0, 12);
  if (ascii(header, 0, 4) !== "RIFF" || ascii(header, 8, 4) !== "WEBP") {
    throw invalidTextureDimensions();
  }

  let offset = 12;
  let chunkCount = 0;
  while (offset + 8 <= source.size && offset < MAX_DIMENSION_HEADER_BYTES) {
    chunkCount += 1;
    if (chunkCount > MAX_DIMENSION_HEADER_SEGMENTS) throw invalidTextureDimensions();
    const chunkHeader = await readBlobBytes(source, offset, 8);
    const chunkType = ascii(chunkHeader, 0, 4);
    const chunkSize = new DataView(chunkHeader.buffer, chunkHeader.byteOffset, chunkHeader.byteLength).getUint32(4, true);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkSize;
    if (!Number.isSafeInteger(dataEnd) || dataEnd > source.size) throw invalidTextureDimensions();

    if (chunkType === "VP8X") {
      if (chunkSize < 10) throw invalidTextureDimensions();
      const data = await readBlobBytes(source, dataOffset, 10);
      return checkedDimensions(uint24LittleEndian(data, 4) + 1, uint24LittleEndian(data, 7) + 1);
    }
    if (chunkType === "VP8L") {
      if (chunkSize < 5) throw invalidTextureDimensions();
      const data = await readBlobBytes(source, dataOffset, 5);
      if (data[0] !== 0x2f) throw invalidTextureDimensions();
      const width = 1 + data[1] + ((data[2] & 0x3f) << 8);
      const height = 1 + ((data[2] & 0xc0) >>> 6) + (data[3] << 2) + ((data[4] & 0x0f) << 10);
      return checkedDimensions(width, height);
    }
    if (chunkType === "VP8 ") {
      if (chunkSize < 10) throw invalidTextureDimensions();
      const data = await readBlobBytes(source, dataOffset, 10);
      if (!bytesEqual(data, [0x9d, 0x01, 0x2a], 3)) throw invalidTextureDimensions();
      const width = (data[6] | (data[7] << 8)) & 0x3fff;
      const height = (data[8] | (data[9] << 8)) & 0x3fff;
      return checkedDimensions(width, height);
    }

    const paddedChunkSize = chunkSize + (chunkSize & 1);
    const nextOffset = dataOffset + paddedChunkSize;
    if (!Number.isSafeInteger(nextOffset) || paddedChunkSize < chunkSize || nextOffset <= offset) {
      throw invalidTextureDimensions();
    }
    offset = nextOffset;
  }
  throw invalidTextureDimensions();
}

async function readEncodedImageDimensions(source: Blob, suppliedContentType?: string): Promise<EncodedImageDimensions> {
  const contentType = (suppliedContentType || source.type).split(";", 1)[0]?.trim().toLowerCase();
  if (contentType === "image/png") return readPngDimensions(source);
  if (contentType === "image/jpeg") return readJpegDimensions(source);
  if (contentType === "image/webp") return readWebpDimensions(source);
  throw invalidTextureDimensions();
}

export async function createTextureBitmap(
  source: Blob,
  options: TextureBitmapOptions = {},
): Promise<ImageBitmap> {
  const factory = options.factory ?? createImageBitmap;
  const bitmapOptions: ImageBitmapOptions = { imageOrientation: "flipY" };
  if (options.maxDimension === undefined) return factory(source, bitmapOptions);

  const maxDimension = Math.floor(options.maxDimension);
  if (!Number.isFinite(maxDimension) || maxDimension < 1) {
    throw new RangeError("Texture bitmap maxDimension must be a positive finite number.");
  }

  const { width, height } = await readEncodedImageDimensions(source, options.contentType);
  const sourceMaxDimension = Math.max(width, height);
  if (sourceMaxDimension <= maxDimension) return factory(source, bitmapOptions);

  const scale = maxDimension / sourceMaxDimension;
  return factory(source, {
    ...bitmapOptions,
    resizeWidth: Math.max(1, Math.round(width * scale)),
    resizeHeight: Math.max(1, Math.round(height * scale)),
    resizeQuality: "high",
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
  private tierValue: RenderedTier;
  private currentPreset: ScenePreset | null = null;
  private currentUrls: string[] = [];
  private highlightedId: string | null = null;
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
      this.camera.position.z = resolveCameraDepth(this.currentPreset, frame.scrollProgress);
      applyPresetGeometry(this.contactSheet, this.currentPreset, frame.scrollProgress);
      this.applyHighlightState();
    }
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
      plane.scale.setScalar(highlightedIndex === null ? 1 : selected ? 1.055 : 0.97);
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
