import { describe, expect, it, vi, type Mock } from "vitest";
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
