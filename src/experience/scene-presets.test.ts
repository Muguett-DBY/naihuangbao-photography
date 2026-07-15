import { describe, expect, it } from "vitest";
import { resolveRoutePreset, SCENE_PRESETS } from "./scene-presets";
import { resolveCameraDepth } from "./three-scene-driver";

describe("immersive route presets", () => {
  it.each([
    ["/", "home"],
    ["/gallery", "gallery"],
    ["/gallery/gallery-urban-01", "photo-detail"],
    ["/courses", "courses"],
    ["/courses/course-1", "course-detail"],
    ["/products", "presets"],
    ["/presets/preset-1", "preset-detail"],
    ["/workshops", "workshops"],
    ["/workshops/workshop-1", "workshop-detail"],
    ["/shop", "shop"],
    ["/shop/item-1", "shop-detail"],
    ["/booking", "booking"],
    ["/map", "map"],
    ["/login", "login"],
    ["/compare", "compare"],
    ["/editor", "editor"],
    ["/missing", "boundary"],
  ] as const)("maps %s to %s", (path, preset) => {
    expect(resolveRoutePreset(path)).toBe(preset);
    expect(SCENE_PRESETS[preset]).toBeDefined();
  });

  it.each(["/dashboard", "/admin", "/admin/photos"])("excludes %s", (path) => {
    expect(resolveRoutePreset(path)).toBeNull();
  });

  it("keeps public preset definitions immutable and within tier budgets", () => {
    expect(Object.isFrozen(SCENE_PRESETS)).toBe(true);

    for (const preset of Object.values(SCENE_PRESETS)) {
      expect(Object.isFrozen(preset)).toBe(true);
      expect(Object.isFrozen(preset.maxPlanes)).toBe(true);
      expect(preset.maxPlanes.medium).toBeLessThanOrEqual(6);
      expect(preset.maxPlanes.high).toBeLessThanOrEqual(10);
    }
  });

  it("uses idle scenes only for the map and editor", () => {
    expect(SCENE_PRESETS.map.idleAfterHero).toBe(true);
    expect(SCENE_PRESETS.editor.idleAfterHero).toBe(true);
  });

  it("maps bounded scroll progress to a smooth camera-depth move", () => {
    const preset = SCENE_PRESETS.home;
    const start = resolveCameraDepth(preset, 0);
    const middle = resolveCameraDepth(preset, 0.5);
    const end = resolveCameraDepth(preset, 1);

    expect(start).toBe(preset.cameraZ);
    expect(middle).toBeLessThan(start);
    expect(end).toBeLessThan(middle);
    expect(start - end).toBeLessThanOrEqual(0.9);
    expect(resolveCameraDepth(preset, -1)).toBe(start);
    expect(resolveCameraDepth(preset, 2)).toBe(end);
    expect(resolveCameraDepth(preset, Number.NaN)).toBe(start);
  });
});
