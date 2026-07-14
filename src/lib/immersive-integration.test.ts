import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ExperienceRuntimeBridge,
  createDeferredExperienceLoad,
  createImageUrlStabilizer,
  isImmersiveCanvasReady,
} from "../experience/experience-controller";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("immersive experience integration", () => {
  it("mounts the adaptive canvas through the public layout", () => {
    expect(read("src/layouts/RootLayout.tsx")).toContain("<ExperienceProvider>");
    expect(read("src/layouts/RootLayout.tsx")).toContain("<ImmersiveExperienceGate");
    expect(read("src/experience/ImmersiveExperienceGate.tsx")).toContain('import("./ImmersiveExperience")');
    expect(read("src/experience/ImmersiveExperience.tsx")).toContain('aria-hidden="true"');
    expect(read("src/components/shared/PageHero.tsx")).toContain("useImmersiveAnchor");
    expect(read("src/styles/site.css")).toContain('@import "./immersive.css"');
    expect(read("src/styles/immersive.css")).toContain("pointer-events: none");
  });

  it("keeps Three.js behind the dynamic immersive branch", () => {
    const rootLayout = read("src/layouts/RootLayout.tsx");
    const gate = read("src/experience/ImmersiveExperienceGate.tsx");
    const provider = read("src/experience/ExperienceProvider.tsx");

    expect(rootLayout).not.toContain('from "three"');
    expect(rootLayout).not.toMatch(/from "\.\.\/experience\/ImmersiveExperience"/);
    expect(gate).toContain('import("./ImmersiveExperience")');
    expect(gate).not.toContain('from "three"');
    expect(provider).not.toContain('from "three"');
    expect(existsSync(resolve(root, "src/experience/ImmersiveExperience.tsx"))).toBe(true);
  });

  it("keeps the canvas layer visible through the hero and only paints post-hero content bands", () => {
    const css = read("src/styles/immersive.css");

    expect(css).not.toContain("main > :not(.page-hero)");
    expect(css).toContain("#main-content .page-hero ~ section");
    expect(css).toContain("#main-content .page-hero ~ .section-shell");
    expect(css).toContain(".site-shell:has(.immersive-experience)");
    expect(css).toContain("background: transparent");
    expect(css).toContain(".immersive-experience");
  });

  it("keeps document visibility publication in the layout and anchor intersection in the runtime bridge", () => {
    const rootLayout = read("src/layouts/RootLayout.tsx");
    const anchor = read("src/experience/useImmersiveAnchor.ts");

    expect(rootLayout).toContain("store.setVisible(document.visibilityState === \"visible\")");
    expect(anchor).not.toContain("setVisible(");
    expect(anchor).toContain("runtimeBridge.setAnchorIntersecting(entry.isIntersecting)");
  });

  it("starts lazy loading at the hard deadline and cleans every pending handle once", () => {
    const load = vi.fn();
    const cancelIdle = vi.fn();
    const cancelDeadline = vi.fn();
    const unsubscribeTrigger = vi.fn();
    let idleCallback: (() => void) | undefined;
    let deadlineCallback: (() => void) | undefined;
    let triggerCallback: (() => void) | undefined;

    const dispose = createDeferredExperienceLoad({
      load,
      scheduleIdle(callback) {
        idleCallback = callback;
        return cancelIdle;
      },
      scheduleDeadline(callback, delayMs) {
        deadlineCallback = callback;
        expect(delayMs).toBe(120);
        return cancelDeadline;
      },
      subscribeImmediateTrigger(callback) {
        triggerCallback = callback;
        return unsubscribeTrigger;
      },
    });

    deadlineCallback?.();
    idleCallback?.();
    triggerCallback?.();
    dispose();

    expect(load).toHaveBeenCalledOnce();
    expect(cancelIdle).toHaveBeenCalledOnce();
    expect(cancelDeadline).toHaveBeenCalledOnce();
    expect(unsubscribeTrigger).toHaveBeenCalledOnce();
  });

  it("lets the first input win and replays deterministic anchor state to the latest runtime", () => {
    const load = vi.fn();
    const triggerUnsubscribe = vi.fn();
    let triggerCallback: (() => void) | undefined;
    const dispose = createDeferredExperienceLoad({
      load,
      scheduleIdle: () => vi.fn(),
      scheduleDeadline: () => vi.fn(),
      subscribeImmediateTrigger(callback) {
        triggerCallback = callback;
        return triggerUnsubscribe;
      },
    });

    triggerCallback?.();
    dispose();
    expect(load).toHaveBeenCalledOnce();
    expect(triggerUnsubscribe).toHaveBeenCalledOnce();

    const bridge = new ExperienceRuntimeBridge();
    bridge.setAnchorIntersecting(true);
    const firstRuntime = { setAnchorIntersecting: vi.fn() };
    const unregisterFirst = bridge.registerRuntime(firstRuntime);
    expect(firstRuntime.setAnchorIntersecting).toHaveBeenCalledWith(true);

    bridge.setAnchorIntersecting(false);
    expect(firstRuntime.setAnchorIntersecting).toHaveBeenLastCalledWith(false);
    unregisterFirst();
    bridge.setAnchorIntersecting(true);
    expect(firstRuntime.setAnchorIntersecting).toHaveBeenCalledTimes(2);

    const secondRuntime = { setAnchorIntersecting: vi.fn() };
    const unregisterSecond = bridge.registerRuntime(secondRuntime);
    expect(secondRuntime.setAnchorIntersecting).toHaveBeenCalledWith(true);
    unregisterSecond();
  });

  it("keeps static runtime readiness hidden and stabilizes equal image descriptor values", () => {
    expect(isImmersiveCanvasReady("high")).toBe(true);
    expect(isImmersiveCanvasReady("static")).toBe(false);

    const stabilize = createImageUrlStabilizer();
    const first = stabilize(["/images/one.webp", "/images/two.webp"]);
    const equalFreshValue = stabilize(["/images/one.webp", "/images/two.webp"]);
    const changed = stabilize(["/images/two.webp"]);

    expect(equalFreshValue).toBe(first);
    expect(changed).not.toBe(first);
  });
});
