import { describe, expect, it, vi } from "vitest";
import { createExperienceStore } from "./experience-store";
import { ImmersiveRuntime, type FrameScheduler } from "./immersive-runtime";
import {
  TextureMorphCoordinator,
  type IdleScheduler,
  type SceneDriver,
} from "./three-scene-driver";
import { TexturePool, type TextureLoadResult } from "./texture-pool";

type FakeScheduler = FrameScheduler & {
  pending: Map<number, FrameRequestCallback>;
  cancelled: number[];
  flush(time: number): void;
};

type MorphTexture = {
  id: string;
  dispose(): void;
};

type MorphLoad = {
  signal: AbortSignal;
  resolve(result: TextureLoadResult<MorphTexture>): void;
  reject(error: unknown): void;
};

type FakeIdleScheduler = IdleScheduler & {
  pending: Map<number, () => void>;
  flushOne(): void;
};

function createIdleScheduler(): FakeIdleScheduler {
  let nextId = 0;
  const pending = new Map<number, () => void>();
  return {
    pending,
    request(callback) {
      const id = ++nextId;
      pending.set(id, callback);
      return id;
    },
    cancel(id) {
      pending.delete(id);
    },
    flushOne() {
      const next = pending.entries().next().value as [number, () => void] | undefined;
      if (!next) return;
      pending.delete(next[0]);
      next[1]();
    },
  };
}

function morphTexture(id: string, bytes = 4): TextureLoadResult<MorphTexture> {
  return { value: { id, dispose: vi.fn() }, width: 1, height: 1, bytes };
}

function createMorphHarness(maxBytes = 64) {
  const loads = new Map<string, MorphLoad[]>();
  const load = vi.fn((url: string, signal: AbortSignal) => new Promise<TextureLoadResult<MorphTexture>>((resolve, reject) => {
    const entries = loads.get(url) ?? [];
    entries.push({ signal, resolve, reject });
    loads.set(url, entries);
  }));
  const pool = new TexturePool<MorphTexture>({ maxBytes, load, dispose: (value) => value.dispose() });
  const idleScheduler = createIdleScheduler();
  const commits: Array<Array<MorphTexture | null>> = [];
  const updates: Array<{ index: number; value: MorphTexture | null }> = [];
  const errors: unknown[] = [];
  const coordinator = new TextureMorphCoordinator({
    pool,
    idleScheduler,
    onCommit: (slots) => commits.push([...slots]),
    onUpdate: (index, value) => updates.push({ index, value }),
    onError: (error) => errors.push(error),
  });
  return { coordinator, pool, idleScheduler, load, loads, commits, updates, errors };
}

function createScheduler(): FakeScheduler {
  let nextId = 0;
  let currentTime = 0;
  const pending = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];

  return {
    pending,
    cancelled,
    request(callback) {
      const id = ++nextId;
      pending.set(id, callback);
      return id;
    },
    cancel(id) {
      cancelled.push(id);
      pending.delete(id);
    },
    now: () => currentTime,
    flush(time) {
      currentTime = time;
      const callbacks = [...pending.values()];
      pending.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

function createDriver() {
  let textureDisposals = 0;
  const driver: SceneDriver = {
    setTier: vi.fn(),
    setSize: vi.fn(),
    morphTo: vi.fn(async () => undefined),
    render: vi.fn(),
    suspend: vi.fn(),
    resume: vi.fn(),
    samplePixels: vi.fn(async () => new Uint8Array()),
    dispose: vi.fn(() => {
      textureDisposals += 1;
    }),
  };
  return { driver, get textureDisposals() { return textureDisposals; } };
}

describe("ImmersiveRuntime", () => {
  it("admits at most three valid route-critical textures before idle loading", async () => {
    const harness = createMorphHarness();
    const morph = harness.coordinator.morph([
      "/one.avif",
      "/two.webp",
      "https://cdn.example.com/blocked.avif",
      "/blocked.jpg",
      "/three.AVIF?width=800",
      "/four.webp",
    ], 6);

    expect(harness.load).toHaveBeenCalledTimes(3);
    expect(harness.load.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost/one.avif",
      "http://localhost/two.webp",
      "http://localhost/three.AVIF?width=800",
    ]);

    harness.loads.get("http://localhost/one.avif")?.[0]?.resolve(morphTexture("one"));
    await morph;
    expect(harness.idleScheduler.pending.size).toBe(1);

    harness.idleScheduler.flushOne();
    expect(harness.load).toHaveBeenCalledTimes(4);
    expect(harness.load).toHaveBeenLastCalledWith("http://localhost/four.webp", expect.any(AbortSignal));
    harness.coordinator.dispose();
    harness.pool.dispose();
  });

  it("commits on the first ready critical texture while later requests hang", async () => {
    const harness = createMorphHarness();
    const morph = harness.coordinator.morph(["/one.avif", "/two.webp", "/three.avif"], 3);
    const ready = morphTexture("two");

    harness.loads.get("http://localhost/two.webp")?.[0]?.resolve(ready);
    await morph;

    expect(harness.commits).toEqual([[null, ready.value, null]]);
    expect(harness.loads.get("http://localhost/one.avif")?.[0]?.signal.aborted).toBe(false);
    expect(harness.loads.get("http://localhost/three.avif")?.[0]?.signal.aborted).toBe(false);
    harness.coordinator.dispose();
    harness.pool.dispose();
  });

  it("starts idle candidates independently when every critical texture hangs", async () => {
    const harness = createMorphHarness();
    const morph = harness.coordinator.morph(["/one.avif", "/two.webp", "/three.avif", "/idle.webp"], 4);

    expect(harness.load).toHaveBeenCalledTimes(3);
    expect(harness.idleScheduler.pending.size).toBe(1);
    harness.idleScheduler.flushOne();
    expect(harness.load).toHaveBeenLastCalledWith("http://localhost/idle.webp", expect.any(AbortSignal));

    const idle = morphTexture("idle");
    harness.loads.get("http://localhost/idle.webp")?.[0]?.resolve(idle);
    await morph;

    expect(harness.commits).toEqual([[null, null, null, idle.value]]);
  });

  it("commits visible ink slots for empty and all-failed morphs", async () => {
    const emptyHarness = createMorphHarness();
    await emptyHarness.coordinator.morph([], 4);
    expect(emptyHarness.commits).toEqual([[null]]);

    const failedHarness = createMorphHarness();
    const failedMorph = failedHarness.coordinator.morph(["/one.avif", "/two.webp"], 2);
    failedHarness.loads.get("http://localhost/one.avif")?.[0]?.reject(new Error("one failed"));
    failedHarness.loads.get("http://localhost/two.webp")?.[0]?.reject(new Error("two failed"));
    await failedMorph;
    expect(failedHarness.commits).toEqual([[null, null]]);
    expect(failedHarness.errors).toHaveLength(0);
  });

  it("keeps old visible textures pinned until replacement commit", async () => {
    const harness = createMorphHarness(8);
    const old = morphTexture("old");
    const oldMorph = harness.coordinator.morph(["/old.avif"], 1);
    harness.loads.get("http://localhost/old.avif")?.[0]?.resolve(old);
    await oldMorph;

    const cache = morphTexture("cache");
    const cachePending = harness.pool.acquire("/cache.webp");
    harness.loads.get("http://localhost/cache.webp")?.[0]?.resolve(cache);
    await cachePending;

    const replacement = morphTexture("replacement");
    const replacementMorph = harness.coordinator.morph(["/replacement.avif"], 1);
    harness.loads.get("http://localhost/replacement.avif")?.[0]?.resolve(replacement);
    await replacementMorph;

    expect(old.value.dispose).not.toHaveBeenCalled();
    expect(cache.value.dispose).toHaveBeenCalledOnce();
    expect(harness.commits.at(-1)).toEqual([replacement.value]);

    harness.pool.setMaxBytes(4);
    expect(old.value.dispose).toHaveBeenCalledOnce();
    expect(replacement.value.dispose).not.toHaveBeenCalled();
  });

  it("aborts obsolete background loads while preserving the old visible texture", async () => {
    const harness = createMorphHarness(8);
    const oldMorph = harness.coordinator.morph(
      ["/visible.avif", "/pending-one.webp", "/pending-two.avif", "/idle.webp"],
      4,
    );
    const visible = morphTexture("visible");
    harness.loads.get("http://localhost/visible.avif")?.[0]?.resolve(visible);
    await oldMorph;
    harness.idleScheduler.flushOne();

    void harness.coordinator.morph(["/replacement.avif"], 1);

    expect(harness.loads.get("http://localhost/pending-one.webp")?.[0]?.signal.aborted).toBe(true);
    expect(harness.loads.get("http://localhost/pending-two.avif")?.[0]?.signal.aborted).toBe(true);
    expect(harness.loads.get("http://localhost/idle.webp")?.[0]?.signal.aborted).toBe(true);
    expect(visible.value.dispose).not.toHaveBeenCalled();
  });

  it("remorphs current textures to a reduced tier slot limit", async () => {
    const harness = createMorphHarness();
    const firstMorph = harness.coordinator.morph(
      ["/one.avif", "/two.webp", "/three.avif", "/four.webp"],
      4,
    );
    const first = morphTexture("one");
    harness.loads.get("http://localhost/one.avif")?.[0]?.resolve(first);
    await firstMorph;

    await harness.coordinator.morph(
      ["/one.avif", "/two.webp", "/three.avif", "/four.webp"],
      2,
    );

    expect(harness.commits.at(-1)).toEqual([first.value, null]);
    expect(harness.commits.at(-1)).toHaveLength(2);
  });

  it("removes mapped slots before releasing pins to enforce a lower tier budget", async () => {
    const harness = createMorphHarness(8);
    const morph = harness.coordinator.morph(["/one.avif", "/two.webp"], 2);
    const first = morphTexture("one");
    const second = morphTexture("two");
    harness.loads.get("http://localhost/one.avif")?.[0]?.resolve(first);
    harness.loads.get("http://localhost/two.webp")?.[0]?.resolve(second);
    await morph;
    await Promise.resolve();

    expect(harness.pool.totalBytes).toBe(8);
    expect(harness.pool.maxBytes).toBe(8);
    expect(first.value.dispose).not.toHaveBeenCalled();
    expect(second.value.dispose).not.toHaveBeenCalled();

    harness.coordinator.enforceBudget(4);

    expect(harness.pool.totalBytes).toBe(4);
    expect(harness.updates).toContainEqual({ index: 1, value: null });
    expect(second.value.dispose).toHaveBeenCalledOnce();
    expect(first.value.dispose).not.toHaveBeenCalled();
  });

  it("restarts queued idle work after budget enforcement", async () => {
    const harness = createMorphHarness(16);
    const morph = harness.coordinator.morph(["/one.avif", "/two.webp", "/three.avif", "/idle.webp"], 4);
    harness.loads.get("http://localhost/one.avif")?.[0]?.resolve(morphTexture("one"));
    await morph;

    expect(harness.idleScheduler.pending.size).toBe(1);
    harness.coordinator.enforceBudget(16);
    expect(harness.idleScheduler.pending.size).toBe(1);

    harness.idleScheduler.flushOne();
    expect(harness.load).toHaveBeenLastCalledWith("http://localhost/idle.webp", expect.any(AbortSignal));
  });

  it("hands off a full visible budget before admitting replacement textures", async () => {
    const harness = createMorphHarness(8);
    const oldMorph = harness.coordinator.morph(["/old.avif"], 1);
    const old = morphTexture("old", 8);
    harness.loads.get("http://localhost/old.avif")?.[0]?.resolve(old);
    await oldMorph;

    const replacementMorph = harness.coordinator.morph(["/replacement.webp"], 1);
    const replacement = morphTexture("replacement", 8);
    harness.loads.get("http://localhost/replacement.webp")?.[0]?.resolve(replacement);
    await replacementMorph;

    expect(harness.pool.totalBytes).toBe(8);
    expect(old.value.dispose).toHaveBeenCalledOnce();
    expect(replacement.value.dispose).not.toHaveBeenCalled();
    expect(harness.commits.at(-1)).toEqual([replacement.value]);
  });

  it("keeps old visible ownership when a replacement commit callback throws", async () => {
    const loads = new Map<string, MorphLoad[]>();
    const pool = new TexturePool<MorphTexture>({
      maxBytes: 8,
      load: (url, signal) => new Promise<TextureLoadResult<MorphTexture>>((resolve, reject) => {
        const entries = loads.get(url) ?? [];
        entries.push({ signal, resolve, reject });
        loads.set(url, entries);
      }),
      dispose: (value) => value.dispose(),
    });
    const commitFailure = new Error("commit failed");
    const onCommit = vi.fn(() => {
      if (onCommit.mock.calls.length === 2) throw commitFailure;
    });
    const errors: unknown[] = [];
    const coordinator = new TextureMorphCoordinator({
      pool,
      idleScheduler: createIdleScheduler(),
      onCommit,
      onUpdate: vi.fn(),
      onError: (error) => errors.push(error),
    });
    const firstMorph = coordinator.morph(["/old.avif"], 1);
    const old = morphTexture("old");
    loads.get("http://localhost/old.avif")?.[0]?.resolve(old);
    await firstMorph;

    const secondMorph = coordinator.morph(["/replacement.webp"], 1);
    const replacement = morphTexture("replacement");
    loads.get("http://localhost/replacement.webp")?.[0]?.resolve(replacement);
    await secondMorph;

    expect(errors).toContain(commitFailure);
    expect(old.value.dispose).not.toHaveBeenCalled();
    expect(replacement.value.dispose).toHaveBeenCalledOnce();
    pool.setMaxBytes(4);
    expect(old.value.dispose).not.toHaveBeenCalled();
  });

  it("retains a visible slot lease when budget clearing onUpdate throws", async () => {
    const loads = new Map<string, MorphLoad[]>();
    const pool = new TexturePool<MorphTexture>({
      maxBytes: 8,
      load: (url, signal) => new Promise<TextureLoadResult<MorphTexture>>((resolve, reject) => {
        const entries = loads.get(url) ?? [];
        entries.push({ signal, resolve, reject });
        loads.set(url, entries);
      }),
      dispose: (value) => value.dispose(),
    });
    const updateFailure = new Error("slot clear failed");
    const onUpdate = vi.fn((_: number, value: MorphTexture | null) => {
      if (value === null) throw updateFailure;
    });
    const errors: unknown[] = [];
    const coordinator = new TextureMorphCoordinator({
      pool,
      idleScheduler: createIdleScheduler(),
      onCommit: vi.fn(),
      onUpdate,
      onError: (error) => errors.push(error),
    });
    const morph = coordinator.morph(["/one.avif", "/two.webp"], 2);
    const first = morphTexture("one");
    const second = morphTexture("two");
    loads.get("http://localhost/one.avif")?.[0]?.resolve(first);
    loads.get("http://localhost/two.webp")?.[0]?.resolve(second);
    await morph;
    await Promise.resolve();

    coordinator.enforceBudget(4);

    expect(errors).toContain(updateFailure);
    expect(pool.totalBytes).toBe(8);
    expect(second.value.dispose).not.toHaveBeenCalled();
  });

  it("creates one driver, morphs presets, and never recreates it for route changes", () => {
    const store = createExperienceStore();
    const scheduler = createScheduler();
    const fake = createDriver();
    const create = vi.fn(() => fake.driver);
    const runtime = new ImmersiveRuntime({ store, tier: "high", createDriver: create, scheduler });

    store.setRoute("home");
    store.setRoute("gallery");

    expect(create).toHaveBeenCalledOnce();
    expect(fake.driver.morphTo).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "home" }), []);
    expect(fake.driver.morphTo).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: "gallery" }), []);
    expect(runtime.state).toBe("active");
  });

  it("reports a morph rejection and retries the same scene on the next store signal", async () => {
    const store = createExperienceStore();
    const scheduler = createScheduler();
    const fake = createDriver();
    const failure = new Error("morph failed");
    const onError = vi.fn();
    vi.mocked(fake.driver.morphTo)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    new ImmersiveRuntime({ store, tier: "high", createDriver: () => fake.driver, scheduler, onError });

    store.setRoute("home");
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(failure);

    store.setPointer(0.25, 0);
    await Promise.resolve();

    expect(fake.driver.morphTo).toHaveBeenCalledTimes(2);
    expect(fake.driver.morphTo).toHaveBeenLastCalledWith(expect.objectContaining({ id: "home" }), []);
  });

  it("requests no frames while hidden, paused, static, or disposed", () => {
    const store = createExperienceStore();
    const scheduler = createScheduler();
    const fake = createDriver();
    const runtime = new ImmersiveRuntime({ store, tier: "high", createDriver: () => fake.driver, scheduler });

    expect(scheduler.pending.size).toBe(1);
    store.setVisible(false);
    expect(scheduler.pending.size).toBe(0);
    expect(runtime.state).toBe("suspended");

    store.setVisible(true);
    expect(scheduler.pending.size).toBe(1);
    store.setPaused("chat", true);
    expect(scheduler.pending.size).toBe(0);

    runtime.dispose();
    expect(scheduler.pending.size).toBe(0);
    expect(runtime.state).toBe("disposed");

    const staticScheduler = createScheduler();
    const create = vi.fn(() => createDriver().driver);
    const staticRuntime = new ImmersiveRuntime({ store: createExperienceStore(), tier: "static", createDriver: create, scheduler: staticScheduler });
    expect(staticRuntime.state).toBe("static");
    expect(staticScheduler.pending.size).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it("downgrades high to medium after the 34ms sustained threshold", () => {
    const scheduler = createScheduler();
    const fake = createDriver();
    const runtime = new ImmersiveRuntime({
      store: createExperienceStore(),
      tier: "high",
      createDriver: () => fake.driver,
      scheduler,
    });
    let time = 0;

    for (let index = 0; index < 44; index += 1) {
      time += 35;
      scheduler.flush(time);
    }
    for (let index = 0; index < 75; index += 1) {
      time += 16;
      scheduler.flush(time);
    }
    expect(fake.driver.setTier).not.toHaveBeenCalled();

    time += 35;
    scheduler.flush(time);

    expect(fake.driver.setTier).toHaveBeenCalledOnce();
    expect(fake.driver.setTier).toHaveBeenCalledWith("medium");
    expect(runtime.tier).toBe("medium");

    const rendersAtDowngrade = vi.mocked(fake.driver.render).mock.calls.length;
    time += 10;
    scheduler.flush(time);
    expect(fake.driver.render).toHaveBeenCalledTimes(rendersAtDowngrade);
    time += 13;
    scheduler.flush(time);
    expect(fake.driver.render).toHaveBeenCalledTimes(rendersAtDowngrade + 1);
  });

  it("allows one context restore and locks static after repeated loss", () => {
    const scheduler = createScheduler();
    const fake = createDriver();
    const runtime = new ImmersiveRuntime({
      store: createExperienceStore(),
      tier: "high",
      createDriver: () => fake.driver,
      scheduler,
    });

    runtime.handleContextLost();
    expect(runtime.state).toBe("suspended");
    expect(scheduler.pending.size).toBe(0);
    runtime.handleContextRestored();
    expect(runtime.state).toBe("active");
    expect(fake.driver.resume).toHaveBeenCalledOnce();

    runtime.handleContextLost();
    expect(runtime.state).toBe("static");
    expect(fake.driver.dispose).toHaveBeenCalledOnce();
    runtime.handleContextRestored();
    expect(runtime.state).toBe("static");
    expect(scheduler.pending.size).toBe(0);
  });

  it("renders one medium-tier idle update without continuing the frame loop", () => {
    const store = createExperienceStore();
    const scheduler = createScheduler();
    const fake = createDriver();
    const runtime = new ImmersiveRuntime({ store, tier: "medium", createDriver: () => fake.driver, scheduler });

    store.setRoute("photo-detail");
    store.setScrollProgress(1);
    expect(runtime.state).toBe("idle");
    expect(scheduler.pending.size).toBe(1);

    scheduler.flush(10);

    expect(fake.driver.render).toHaveBeenCalledOnce();
    expect(scheduler.pending.size).toBe(0);
  });

  it("does not classify idle wall-clock gaps as frame cost", () => {
    const store = createExperienceStore();
    const scheduler = createScheduler();
    const fake = createDriver();
    const runtime = new ImmersiveRuntime({ store, tier: "high", createDriver: () => fake.driver, scheduler });
    store.setRoute("photo-detail");
    store.setScrollProgress(1);

    for (let index = 0; index < 120; index += 1) {
      store.setPointer(index % 2 === 0 ? 0.25 : -0.25, 0);
      scheduler.flush((index + 1) * 1000);
    }

    expect(runtime.state).toBe("idle");
    expect(fake.driver.setTier).not.toHaveBeenCalled();
    for (const [frame] of vi.mocked(fake.driver.render).mock.calls) expect(frame.delta).toBe(0);
  });

  it("resynchronizes medium cadence after a long scheduling delay", () => {
    const scheduler = createScheduler();
    const fake = createDriver();
    new ImmersiveRuntime({
      store: createExperienceStore(),
      tier: "medium",
      createDriver: () => fake.driver,
      scheduler,
    });

    scheduler.flush(1000);
    expect(fake.driver.render).toHaveBeenCalledOnce();
    scheduler.flush(1001);
    expect(fake.driver.render).toHaveBeenCalledOnce();
    scheduler.flush(1023);
    expect(fake.driver.render).toHaveBeenCalledTimes(2);
  });

  it("resynchronizes medium backlog across 40ms, 80ms, and 81ms callbacks", () => {
    const scheduler = createScheduler();
    const fake = createDriver();
    new ImmersiveRuntime({
      store: createExperienceStore(),
      tier: "medium",
      createDriver: () => fake.driver,
      scheduler,
    });

    scheduler.flush(40);
    scheduler.flush(80);
    scheduler.flush(81);

    expect(fake.driver.render).not.toHaveBeenCalledTimes(3);
    expect(fake.driver.render).toHaveBeenCalledTimes(2);
  });

  it("disposes driver, textures, subscriptions, and scheduled frames", () => {
    const store = createExperienceStore();
    const scheduler = createScheduler();
    const fake = createDriver();
    const runtime = new ImmersiveRuntime({ store, tier: "medium", createDriver: () => fake.driver, scheduler });
    const scheduledId = [...scheduler.pending.keys()][0];

    runtime.dispose();
    store.setRoute("gallery");

    expect(fake.driver.dispose).toHaveBeenCalledOnce();
    expect(fake.textureDisposals).toBe(1);
    expect(fake.driver.morphTo).not.toHaveBeenCalled();
    expect(scheduledId).toBeDefined();
    expect(scheduler.cancelled).toContain(scheduledId);
    expect(scheduler.pending.size).toBe(0);
  });

  it("reaches disposed and static terminal states when driver disposal throws", () => {
    const disposeFailure = new Error("driver dispose failed");
    const disposeStore = createExperienceStore();
    const disposeScheduler = createScheduler();
    const disposeFake = createDriver();
    const disposeError = vi.fn();
    vi.mocked(disposeFake.driver.dispose).mockImplementation(() => {
      throw disposeFailure;
    });
    const disposed = new ImmersiveRuntime({
      store: disposeStore,
      tier: "high",
      createDriver: () => disposeFake.driver,
      scheduler: disposeScheduler,
      onError: disposeError,
    });

    expect(() => disposed.dispose()).not.toThrow();
    expect(disposed.state).toBe("disposed");
    expect(disposeScheduler.pending.size).toBe(0);
    disposeStore.setRoute("gallery");
    expect(disposeFake.driver.morphTo).not.toHaveBeenCalled();
    expect(disposeError).toHaveBeenCalledWith(expect.any(AggregateError));

    const staticStore = createExperienceStore();
    const staticFake = createDriver();
    const staticError = vi.fn();
    vi.mocked(staticFake.driver.dispose).mockImplementation(() => {
      throw disposeFailure;
    });
    const locked = new ImmersiveRuntime({
      store: staticStore,
      tier: "high",
      createDriver: () => staticFake.driver,
      scheduler: createScheduler(),
      onError: staticError,
    });
    locked.handleContextLost();

    expect(() => locked.handleContextLost()).not.toThrow();
    expect(locked.state).toBe("static");
    staticStore.setRoute("gallery");
    expect(staticFake.driver.morphTo).not.toHaveBeenCalled();
    expect(staticError).toHaveBeenCalledWith(expect.any(AggregateError));
  });
});
