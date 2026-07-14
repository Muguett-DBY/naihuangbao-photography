import { describe, expect, it, vi } from "vitest";
import { createExperienceStore } from "./experience-store";

describe("experience store", () => {
  it("registers one active anchor and ignores stale unregister calls", () => {
    const store = createExperienceStore();
    const first = store.registerAnchor({ id: "home", preset: "home", imageUrls: ["/one.webp"] });
    const second = store.registerAnchor({ id: "gallery", preset: "gallery", imageUrls: ["/two.webp"] });
    first();
    expect(store.getSnapshot().anchor?.id).toBe("gallery");
    second();
    expect(store.getSnapshot().anchor).toBeNull();
  });

  it("does not resume until every pause reason clears", () => {
    const store = createExperienceStore();
    store.setPaused("chat", true);
    store.setPaused("hidden", true);
    store.setPaused("chat", false);
    expect(store.getSnapshot().paused).toBe(true);
    store.setPaused("hidden", false);
    expect(store.getSnapshot().paused).toBe(false);
  });

  it("notifies subscribers only when a snapshot field changes", () => {
    const store = createExperienceStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setPointer(0.2, -0.1);
    store.setPointer(0.2, -0.1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("keeps the current snapshot stable when values do not change", () => {
    const store = createExperienceStore();
    const snapshot = store.getSnapshot();

    store.setPointer(0, 0);
    store.setScrollProgress(0);
    store.setVisible(true);

    expect(store.getSnapshot()).toBe(snapshot);
  });

  it("clamps pointer and scroll values to renderer-safe bounds", () => {
    const store = createExperienceStore();

    store.setPointer(4, -3);
    store.setScrollProgress(2);

    expect(store.getSnapshot()).toMatchObject({ pointerX: 1, pointerY: -1, scrollProgress: 1 });
  });

  it("copies pause reasons before changing them", () => {
    const store = createExperienceStore();
    store.setPaused("chat", true);
    const chatPaused = store.getSnapshot();

    store.setPaused("hidden", true);

    expect(chatPaused.pauseReasons.has("hidden")).toBe(false);
    expect(store.getSnapshot().pauseReasons.has("hidden")).toBe(true);
  });

  it("uses visibility to pause without clearing another active reason", () => {
    const store = createExperienceStore();
    store.setPaused("chat", true);
    store.setVisible(false);
    store.setVisible(true);

    expect(store.getSnapshot()).toMatchObject({ visible: true, paused: true });
    expect(store.getSnapshot().pauseReasons).toEqual(new Set(["chat"]));
  });
});
