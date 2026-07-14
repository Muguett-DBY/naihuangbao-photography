import { describe, expect, it } from "vitest";
import { resolveRoutePreset, SCENE_PRESETS } from "./scene-presets";

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
});
