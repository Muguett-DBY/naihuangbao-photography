import { describe, expect, it, vi, type Mock } from "vitest";
import { TexturePool, type TextureLoadResult } from "./texture-pool";

type TextureLike = {
  id: string;
  dispose: Mock<() => void>;
};

type DeferredLoad = {
  signal: AbortSignal;
  resolve(result: TextureLoadResult<TextureLike>): void;
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
  const load = vi.fn((url: string, signal: AbortSignal) => new Promise<TextureLoadResult<TextureLike>>((resolve) => {
    const pending = loads.get(url) ?? [];
    pending.push({ signal, resolve });
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

    const pending = pool.acquire("/portrait.jpg");
    const reusedPending = pool.acquire("/portrait.jpg");
    const loaded = texture("portrait");
    loads.get("http://localhost/portrait.jpg")?.[0]?.resolve(loaded);

    expect(reusedPending).toBe(pending);
    await expect(pending).resolves.toBe(loaded.value);
    await expect(pool.acquire("/portrait.jpg")).resolves.toBe(loaded.value);
    expect(load).toHaveBeenCalledOnce();
  });

  it("aborts obsolete loads without caching stale completions", async () => {
    const { pool, load, loads } = createDeferredPool();
    const pending = pool.acquire("/old.jpg");
    const staleLoad = loads.get("http://localhost/old.jpg")?.[0];

    pool.retain(["/new.jpg"]);
    expect(staleLoad?.signal.aborted).toBe(true);

    const stale = texture("stale");
    staleLoad?.resolve(stale);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(stale.value.dispose).toHaveBeenCalledOnce();

    void pool.acquire("/old.jpg");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("evicts least-recently-used textures within the tier byte budget", async () => {
    const { pool, loads } = createDeferredPool(8);
    const first = texture("first");
    const second = texture("second");
    const third = texture("third");

    const firstPending = pool.acquire("/first.jpg");
    loads.get("http://localhost/first.jpg")?.[0]?.resolve(first);
    await firstPending;
    const secondPending = pool.acquire("/second.jpg");
    loads.get("http://localhost/second.jpg")?.[0]?.resolve(second);
    await secondPending;
    await pool.acquire("/first.jpg");
    const thirdPending = pool.acquire("/third.jpg");
    loads.get("http://localhost/third.jpg")?.[0]?.resolve(third);
    await thirdPending;

    expect(pool.totalBytes).toBe(8);
    pool.retain(["/first.jpg", "/second.jpg", "/third.jpg"]);

    expect(pool.totalBytes).toBe(8);
    expect(second.value.dispose).toHaveBeenCalledOnce();
    expect(first.value.dispose).not.toHaveBeenCalled();
    expect(third.value.dispose).not.toHaveBeenCalled();
  });

  it("disposes every cached texture exactly once", async () => {
    const { pool, loads } = createDeferredPool();
    const fulfilled = texture("fulfilled");
    const stale = texture("stale");

    const fulfilledPending = pool.acquire("/fulfilled.jpg");
    loads.get("http://localhost/fulfilled.jpg")?.[0]?.resolve(fulfilled);
    await fulfilledPending;
    const stalePending = pool.acquire("/pending.jpg");
    const staleLoad = loads.get("http://localhost/pending.jpg")?.[0];

    pool.dispose();
    pool.dispose();
    staleLoad?.resolve(stale);

    await expect(stalePending).rejects.toMatchObject({ name: "AbortError" });
    expect(fulfilled.value.dispose).toHaveBeenCalledOnce();
    expect(stale.value.dispose).toHaveBeenCalledOnce();
    expect(pool.totalBytes).toBe(0);
  });
});
