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

  it("keeps document visibility publication in the layout and explicit anchor ownership in the runtime bridge", () => {
    const rootLayout = read("src/layouts/RootLayout.tsx");
    const anchor = read("src/experience/useImmersiveAnchor.ts");
    const immersiveExperience = read("src/experience/ImmersiveExperience.tsx");

    expect(rootLayout).toContain("store.setVisible(document.visibilityState === \"visible\")");
    expect(anchor).not.toContain("setVisible(");
    expect(anchor).toContain("runtimeBridge.registerAnchor(");
    expect(anchor).toContain("anchorRegistration.setIntersecting(entry.isIntersecting)");
    expect(anchor).toContain("anchorRegistration.unregister()");
    expect(immersiveExperience).toContain("runtimeBridge.registerRuntime(runtime)");
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

  it("lets the first input win", () => {
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

  });

  it("replays no-anchor route rendering and anchor intersection state to lazy runtimes", () => {
    type AnchorLease = { setIntersecting(intersecting: boolean): void; unregister(): void };
    type AnchorAwareBridge = ExperienceRuntimeBridge & { registerAnchor(intersecting: boolean): AnchorLease };
    const bridge = new ExperienceRuntimeBridge() as AnchorAwareBridge;

    const routeRuntime = { setAnchorIntersecting: vi.fn() };
    bridge.registerRuntime(routeRuntime);
    expect(routeRuntime.setAnchorIntersecting).toHaveBeenCalledWith(true);

    const beforeRuntimeBridge = new ExperienceRuntimeBridge() as AnchorAwareBridge;
    const beforeRuntimeAnchor = beforeRuntimeBridge.registerAnchor(false);
    const lazyRuntime = { setAnchorIntersecting: vi.fn() };
    beforeRuntimeBridge.registerRuntime(lazyRuntime);
    expect(lazyRuntime.setAnchorIntersecting).toHaveBeenCalledWith(false);

    beforeRuntimeAnchor.setIntersecting(true);
    expect(lazyRuntime.setAnchorIntersecting).toHaveBeenLastCalledWith(true);
  });

  it("clears only the current anchor and resumes route rendering after exact cleanup", () => {
    type AnchorLease = { setIntersecting(intersecting: boolean): void; unregister(): void };
    type AnchorAwareBridge = ExperienceRuntimeBridge & { registerAnchor(intersecting: boolean): AnchorLease };
    const bridge = new ExperienceRuntimeBridge() as AnchorAwareBridge;
    const runtime = { setAnchorIntersecting: vi.fn() };
    bridge.registerRuntime(runtime);

    const first = bridge.registerAnchor(false);
    expect(runtime.setAnchorIntersecting).toHaveBeenLastCalledWith(false);
    const second = bridge.registerAnchor(false);
    first.unregister();
    expect(runtime.setAnchorIntersecting).toHaveBeenLastCalledWith(false);

    second.setIntersecting(true);
    second.setIntersecting(false);
    second.unregister();
    expect(runtime.setAnchorIntersecting).toHaveBeenLastCalledWith(true);
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

  it("registers every flagship page and publishes gallery focus without importing Three.js", () => {
    const home = read("src/pages/HomePage.tsx");
    const galleryPage = read("src/pages/GalleryPage.tsx");
    const photoDetail = read("src/pages/PhotoDetailPage.tsx");
    const gallery = read("src/components/Gallery.tsx");
    const canvas = read("src/experience/ImmersiveExperience.tsx");

    for (const source of [home, galleryPage, photoDetail]) {
      expect(source).toContain("useImmersiveAnchor");
      expect(source).not.toContain('from "three"');
    }
    expect(home).toContain('data-immersive-anchor="home"');
    expect(galleryPage).toContain('data-immersive-anchor="gallery"');
    expect(photoDetail).toContain('data-immersive-anchor="photo-detail"');
    expect(gallery).toContain("setHighlightedId");
    expect(gallery).toContain("onPointerEnter");
    expect(gallery).toContain("onFocusCapture");
    expect(canvas).toContain("scenePreset");
  });

  it("registers every catalogue index and detail page with its exact scene preset", () => {
    const coverage = {
      "src/pages/CoursesPage.tsx": "courses",
      "src/pages/CourseDetailPage.tsx": "course-detail",
      "src/pages/ProductsPage.tsx": "presets",
      "src/pages/PresetDetailPage.tsx": "preset-detail",
      "src/pages/WorkshopsPage.tsx": "workshops",
      "src/pages/WorkshopDetailPage.tsx": "workshop-detail",
      "src/pages/ShopPage.tsx": "shop",
      "src/pages/ShopDetailPage.tsx": "shop-detail",
    } as const;

    for (const [file, preset] of Object.entries(coverage)) {
      const source = read(file);
      expect(
        source.includes(`immersivePreset="${preset}"`)
          || source.includes(`preset: "${preset}"`),
        `${file} must register ${preset}`,
      ).toBe(true);
      expect(source).not.toContain('from "three"');
    }
  });
});
