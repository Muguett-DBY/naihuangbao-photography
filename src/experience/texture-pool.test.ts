import { describe, expect, it, vi, type Mock } from "vitest";
import { createTextureBitmap, validateTextureResponse } from "./three-scene-driver";
import { TexturePool, type TextureLoadResult } from "./texture-pool";

type TextureLike = {
  id: string;
  dispose: Mock<() => void>;
};

type DeferredLoad = {
  signal: AbortSignal;
  resolve(result: TextureLoadResult<TextureLike>): void;
  reject(error: unknown): void;
};

function texture(id: string, bytes = 4): TextureLoadResult<TextureLike> {
  return {
    value: { id, dispose: vi.fn() },
    width: 1,
    height: 1,
    bytes,
  };
}

function pngBlob(width: number, height: number): Blob {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes], { type: "image/png" });
}

function jpegBlob(width: number, height: number): Blob {
  const bytes = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ]);
  return new Blob([bytes], { type: "image/jpeg" });
}

function jpegBlobAfterSegments(segmentCount: number, width: number, height: number): Blob {
  const bytes = new Uint8Array(2 + segmentCount * 4 + 19);
  bytes.set([0xff, 0xd8]);
  for (let index = 0; index < segmentCount; index += 1) {
    bytes.set([0xff, 0xe0, 0x00, 0x02], 2 + index * 4);
  }
  const frameOffset = 2 + segmentCount * 4;
  bytes.set([
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ], frameOffset);
  return new Blob([bytes], { type: "image/jpeg" });
}

function webpBlob(width: number, height: number): Blob {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12);
  new DataView(bytes.buffer).setUint32(16, 10, true);
  const widthMinusOne = width - 1;
  const heightMinusOne = height - 1;
  bytes.set([widthMinusOne & 0xff, (widthMinusOne >>> 8) & 0xff, (widthMinusOne >>> 16) & 0xff], 24);
  bytes.set([heightMinusOne & 0xff, (heightMinusOne >>> 8) & 0xff, (heightMinusOne >>> 16) & 0xff], 27);
  return new Blob([bytes], { type: "image/webp" });
}

function createDeferredPool(maxBytes = 24 * 1024 * 1024) {
  const loads = new Map<string, DeferredLoad[]>();
  const load = vi.fn((url: string, signal: AbortSignal) => new Promise<TextureLoadResult<TextureLike>>((resolve, reject) => {
    const pending = loads.get(url) ?? [];
    pending.push({ signal, resolve, reject });
    loads.set(url, pending);
  }));
  const pool = new TexturePool<TextureLike>({
    maxBytes,
    load,
    dispose: (value) => value.dispose(),
  });

  return { pool, load, loads };
}

describe("TexturePool", () => {
  it("reuses pending and fulfilled textures by URL", async () => {
    const { pool, load, loads } = createDeferredPool();

    const pending = pool.acquire("/portrait.avif");
    const reusedPending = pool.acquire("/portrait.avif");
    const loaded = texture("portrait");
    loads.get("http://localhost/portrait.avif")?.[0]?.resolve(loaded);

    expect(reusedPending).toBe(pending);
    await expect(pending).resolves.toBe(loaded.value);
    await expect(pool.acquire("/portrait.avif")).resolves.toBe(loaded.value);
    expect(load).toHaveBeenCalledOnce();
  });

  it("aborts obsolete loads without caching stale completions", async () => {
    const { pool, load, loads } = createDeferredPool();
    const pending = pool.acquire("/old.avif");
    const staleLoad = loads.get("http://localhost/old.avif")?.[0];

    pool.retain(["/new.webp"]);
    expect(staleLoad?.signal.aborted).toBe(true);

    const stale = texture("stale");
    staleLoad?.resolve(stale);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(stale.value.dispose).toHaveBeenCalledOnce();

    void pool.acquire("/old.avif");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("evicts least-recently-used textures within the tier byte budget", async () => {
    const { pool, loads } = createDeferredPool(8);
    const first = texture("first");
    const second = texture("second");
    const third = texture("third");

    const firstPending = pool.acquire("/first.avif");
    loads.get("http://localhost/first.avif")?.[0]?.resolve(first);
    await firstPending;
    const secondPending = pool.acquire("/second.webp");
    loads.get("http://localhost/second.webp")?.[0]?.resolve(second);
    await secondPending;
    await pool.acquire("/first.avif");
    const thirdPending = pool.acquire("/third.avif");
    loads.get("http://localhost/third.avif")?.[0]?.resolve(third);
    await thirdPending;

    expect(pool.totalBytes).toBe(8);
    pool.retain(["/first.avif", "/second.webp", "/third.avif"]);

    expect(pool.totalBytes).toBe(8);
    expect(second.value.dispose).toHaveBeenCalledOnce();
    expect(first.value.dispose).not.toHaveBeenCalled();
    expect(third.value.dispose).not.toHaveBeenCalled();
  });

  it("disposes every cached texture exactly once", async () => {
    const { pool, loads } = createDeferredPool();
    const fulfilled = texture("fulfilled");
    const stale = texture("stale");

    const fulfilledPending = pool.acquire("/fulfilled.avif");
    loads.get("http://localhost/fulfilled.avif")?.[0]?.resolve(fulfilled);
    await fulfilledPending;
    const stalePending = pool.acquire("/pending.webp");
    const staleLoad = loads.get("http://localhost/pending.webp")?.[0];

    pool.dispose();
    pool.dispose();
    staleLoad?.resolve(stale);

    await expect(stalePending).rejects.toMatchObject({ name: "AbortError" });
    expect(fulfilled.value.dispose).toHaveBeenCalledOnce();
    expect(stale.value.dispose).toHaveBeenCalledOnce();
    expect(pool.totalBytes).toBe(0);
  });

  it("accepts normalized same-origin AVIF and WebP URLs only", () => {
    const { pool, load } = createDeferredPool();

    void pool.acquire("/gallery/PORTRAIT.AVIF?size=large#ignored");
    void pool.acquire("http://localhost/gallery/portrait.webp");

    expect(load).toHaveBeenNthCalledWith(
      1,
      "http://localhost/gallery/PORTRAIT.AVIF?size=large",
      expect.any(AbortSignal),
    );
    expect(() => pool.acquire("https://cdn.example.com/portrait.avif")).toThrow(TypeError);
    expect(() => pool.acquire("data:image/webp;base64,AAAA")).toThrow(TypeError);
    expect(() => pool.acquire("/gallery/portrait.jpg")).toThrow(TypeError);
    expect(() => pool.acquire("/gallery/portrait.png")).toThrow(TypeError);
  });

  it("accepts only the same-origin public photo image endpoint without an extension", () => {
    const { pool, load } = createDeferredPool();

    void pool.acquire("/api/photos/7c89df68-4f32-46a7-9cb9-b47ec62c78b8/image?variant=full#ignored");

    expect(load).toHaveBeenCalledWith(
      "http://localhost/api/photos/7c89df68-4f32-46a7-9cb9-b47ec62c78b8/image?variant=full",
      expect.any(AbortSignal),
    );
    expect(() => pool.acquire("/api/photos/7c89df68-4f32-46a7-9cb9-b47ec62c78b8/download")).toThrow(TypeError);
    expect(() => pool.acquire("/api/photos/id/image/extra")).toThrow(TypeError);
    expect(() => pool.acquire("https://cdn.example.com/api/photos/id/image")).toThrow(TypeError);
  });

  it("rejects redirected or non-image texture responses before bitmap creation", () => {
    const requestedUrl = "http://localhost/gallery/portrait.avif";
    const response = (overrides: Partial<Response> = {}) => ({
      ok: true,
      redirected: false,
      url: requestedUrl,
      headers: new Headers({ "content-type": "image/avif; charset=binary" }),
      ...overrides,
    }) as Pick<Response, "ok" | "redirected" | "url" | "headers">;

    expect(() => validateTextureResponse(requestedUrl, response())).not.toThrow();
    expect(() => validateTextureResponse(requestedUrl, response({ redirected: true }))).toThrow(/redirect/i);
    expect(() => validateTextureResponse(requestedUrl, response({ url: "https://cdn.example.com/portrait.avif" }))).toThrow(/same-origin/i);
    expect(() => validateTextureResponse(requestedUrl, response({ headers: new Headers() }))).toThrow(/content-type/i);
    expect(() => validateTextureResponse(requestedUrl, response({ headers: new Headers({ "content-type": "image/jpeg" }) }))).toThrow(/content-type/i);
  });

  it("accepts uploaded JPEG, PNG, and WebP responses only for the public photo endpoint", () => {
    const requestedUrl = "http://localhost/api/photos/7c89df68-4f32-46a7-9cb9-b47ec62c78b8/image";
    const response = (contentType: string) => ({
      ok: true,
      redirected: false,
      url: requestedUrl,
      headers: new Headers({ "content-type": contentType }),
    }) as Pick<Response, "ok" | "redirected" | "url" | "headers">;

    expect(() => validateTextureResponse(requestedUrl, response("image/jpeg"))).not.toThrow();
    expect(() => validateTextureResponse(requestedUrl, response("image/png"))).not.toThrow();
    expect(() => validateTextureResponse(requestedUrl, response("image/webp"))).not.toThrow();
    expect(() => validateTextureResponse(requestedUrl, response("image/svg+xml"))).toThrow(/content-type/i);
  });

  it("flips portrait bitmaps during decode for upright WebGL textures", async () => {
    const source = new Blob(["portrait"]);
    const bitmap = { width: 1, height: 1, close: vi.fn() } as unknown as ImageBitmap;
    const createBitmap = vi.fn(async () => bitmap);

    await expect(createTextureBitmap(source, { factory: createBitmap })).resolves.toBe(bitmap);
    expect(createBitmap).toHaveBeenCalledWith(source, { imageOrientation: "flipY" });
  });

  it.each([
    ["PNG landscape", pngBlob(8000, 6000), 1280, 960],
    ["JPEG landscape", jpegBlob(8000, 6000), 1280, 960],
    ["WebP portrait", webpBlob(6000, 8000), 960, 1280],
  ])("downscales a large uploaded %s before bitmap allocation", async (_name, source, width, height) => {
    const bitmap = { width, height, close: vi.fn() } as unknown as ImageBitmap;
    const createBitmap = vi.fn(async () => bitmap);

    await expect(createTextureBitmap(source, { factory: createBitmap, maxDimension: 1280 })).resolves.toBe(bitmap);
    expect(createBitmap).toHaveBeenCalledWith(source, {
      imageOrientation: "flipY",
      resizeHeight: height,
      resizeQuality: "high",
      resizeWidth: width,
    });
  });

  it("does not upscale a small uploaded bitmap", async () => {
    const source = pngBlob(640, 480);
    const bitmap = { width: 640, height: 480, close: vi.fn() } as unknown as ImageBitmap;
    const createBitmap = vi.fn(async () => bitmap);

    await createTextureBitmap(source, { factory: createBitmap, maxDimension: 1280 });
    expect(createBitmap).toHaveBeenCalledWith(source, { imageOrientation: "flipY" });
  });

  it("rejects an uploaded bitmap whose encoded dimensions cannot be read", async () => {
    const source = new Blob(["not-an-image"], { type: "image/jpeg" });
    const createBitmap = vi.fn();

    await expect(createTextureBitmap(source, { factory: createBitmap, maxDimension: 1280 })).rejects.toThrow(/dimensions/i);
    expect(createBitmap).not.toHaveBeenCalled();
  });

  it("bounds encoded-header scanning before bitmap creation", async () => {
    const source = jpegBlobAfterSegments(257, 8000, 6000);
    const createBitmap = vi.fn();

    await expect(createTextureBitmap(source, { factory: createBitmap, maxDimension: 1280 })).rejects.toThrow(/dimensions/i);
    expect(createBitmap).not.toHaveBeenCalled();
  });

  it("never evicts pinned visible or staged textures under budget pressure", async () => {
    const { pool, loads } = createDeferredPool(8);
    const visible = texture("visible");
    const staged = texture("staged");
    const pressure = texture("pressure");
    const visibleLease = pool.pin(["/visible.avif"]);
    const stagedLease = pool.pin(["/staged.webp"]);

    const visiblePending = pool.acquire("/visible.avif");
    loads.get("http://localhost/visible.avif")?.[0]?.resolve(visible);
    await visiblePending;
    const stagedPending = pool.acquire("/staged.webp");
    loads.get("http://localhost/staged.webp")?.[0]?.resolve(staged);
    await stagedPending;
    const pressurePending = pool.acquire("/pressure.avif");
    loads.get("http://localhost/pressure.avif")?.[0]?.resolve(pressure);

    await expect(pressurePending).rejects.toBeInstanceOf(RangeError);
    expect(visible.value.dispose).not.toHaveBeenCalled();
    expect(staged.value.dispose).not.toHaveBeenCalled();
    expect(pressure.value.dispose).toHaveBeenCalledOnce();
    expect(pool.totalBytes).toBe(8);

    visibleLease.release();
    const admitted = pool.acquire("/pressure.avif");
    loads.get("http://localhost/pressure.avif")?.[1]?.resolve(texture("replacement"));
    await admitted;
    expect(visible.value.dispose).toHaveBeenCalledOnce();
    expect(staged.value.dispose).not.toHaveBeenCalled();
    stagedLease.release();
  });

  it("reports a lowered budget blocked by pins without disposing pinned values", async () => {
    const { pool, loads } = createDeferredPool(8);
    const first = texture("first");
    const second = texture("second");
    const firstLease = pool.pin(["/first.avif"]);
    const secondLease = pool.pin(["/second.webp"]);
    const firstPending = pool.acquire("/first.avif");
    loads.get("http://localhost/first.avif")?.[0]?.resolve(first);
    await firstPending;
    const secondPending = pool.acquire("/second.webp");
    loads.get("http://localhost/second.webp")?.[0]?.resolve(second);
    await secondPending;

    expect(() => pool.setMaxBytes(4)).toThrow(RangeError);
    expect(pool.totalBytes).toBe(8);
    expect(first.value.dispose).not.toHaveBeenCalled();
    expect(second.value.dispose).not.toHaveBeenCalled();

    secondLease.release();
    expect(pool.totalBytes).toBe(4);
    expect(second.value.dispose).toHaveBeenCalledOnce();
    firstLease.release();
  });

  it("continues eviction after a disposer throws and reports aggregated errors", async () => {
    const disposed: string[] = [];
    const pool = new TexturePool<TextureLike>({
      maxBytes: 12,
      load: async (url) => texture(url),
      dispose(value) {
        disposed.push(value.id);
        if (value.id.includes("second")) throw new Error("second dispose failed");
      },
    });

    await pool.acquire("/first.avif");
    await pool.acquire("/second.webp");
    await pool.acquire("/third.avif");

    expect(() => pool.setMaxBytes(0)).toThrow(AggregateError);
    expect(disposed).toEqual([
      "http://localhost/first.avif",
      "http://localhost/second.webp",
      "http://localhost/third.avif",
    ]);
    expect(pool.totalBytes).toBe(0);
  });

  it("continues final disposal after a disposer throws and empties ownership", async () => {
    const disposed: string[] = [];
    const pool = new TexturePool<TextureLike>({
      maxBytes: 12,
      load: async (url) => texture(url),
      dispose(value) {
        disposed.push(value.id);
        if (value.id.includes("first")) throw new Error("first dispose failed");
      },
    });

    await pool.acquire("/first.avif");
    await pool.acquire("/second.webp");

    expect(() => pool.dispose()).toThrow(AggregateError);
    expect(disposed).toEqual(["http://localhost/first.avif", "http://localhost/second.webp"]);
    expect(pool.totalBytes).toBe(0);
    expect(() => pool.dispose()).not.toThrow();
  });
});
