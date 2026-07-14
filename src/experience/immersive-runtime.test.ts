import { describe, expect, it, vi } from "vitest";
import { createExperienceStore } from "./experience-store";
import { ImmersiveRuntime, type FrameScheduler } from "./immersive-runtime";
import type { SceneDriver } from "./three-scene-driver";

type FakeScheduler = FrameScheduler & {
  pending: Map<number, FrameRequestCallback>;
  cancelled: number[];
  flush(time: number): void;
};

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
});
