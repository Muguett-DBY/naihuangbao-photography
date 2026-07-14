import type { ExperienceTier } from "./capability-tier";

export type ScenePresetId =
  | "home"
  | "gallery"
  | "photo-detail"
  | "courses"
  | "course-detail"
  | "presets"
  | "preset-detail"
  | "workshops"
  | "workshop-detail"
  | "shop"
  | "shop-detail"
  | "booking"
  | "map"
  | "login"
  | "compare"
  | "editor"
  | "boundary";

type RenderedExperienceTier = Exclude<ExperienceTier, "static">;

export type ScenePreset = {
  id: ScenePresetId;
  composition: "tunnel" | "archive" | "focus" | "machine" | "coordinates" | "shutter" | "calibration" | "boundary";
  cameraZ: number;
  depth: number;
  accent: "moss" | "coral" | "sun" | "sky";
  maxPlanes: Record<RenderedExperienceTier, number>;
  idleAfterHero: boolean;
};

function definePreset(preset: ScenePreset): ScenePreset {
  return Object.freeze({
    ...preset,
    maxPlanes: Object.freeze({ ...preset.maxPlanes }),
  });
}

export const SCENE_PRESETS: Readonly<Record<ScenePresetId, ScenePreset>> = Object.freeze({
  home: definePreset({
    id: "home",
    composition: "tunnel",
    cameraZ: 6.4,
    depth: 22,
    accent: "moss",
    maxPlanes: { medium: 4, high: 7 },
    idleAfterHero: false,
  }),
  gallery: definePreset({
    id: "gallery",
    composition: "archive",
    cameraZ: 6.8,
    depth: 18,
    accent: "coral",
    maxPlanes: { medium: 6, high: 10 },
    idleAfterHero: false,
  }),
  "photo-detail": definePreset({
    id: "photo-detail",
    composition: "focus",
    cameraZ: 5.2,
    depth: 14,
    accent: "sun",
    maxPlanes: { medium: 3, high: 6 },
    idleAfterHero: true,
  }),
  courses: definePreset({
    id: "courses",
    composition: "machine",
    cameraZ: 6.1,
    depth: 16,
    accent: "moss",
    maxPlanes: { medium: 4, high: 8 },
    idleAfterHero: false,
  }),
  "course-detail": definePreset({
    id: "course-detail",
    composition: "focus",
    cameraZ: 5.4,
    depth: 13,
    accent: "moss",
    maxPlanes: { medium: 3, high: 5 },
    idleAfterHero: true,
  }),
  presets: definePreset({
    id: "presets",
    composition: "calibration",
    cameraZ: 6,
    depth: 15,
    accent: "coral",
    maxPlanes: { medium: 4, high: 8 },
    idleAfterHero: false,
  }),
  "preset-detail": definePreset({
    id: "preset-detail",
    composition: "calibration",
    cameraZ: 5.3,
    depth: 12,
    accent: "coral",
    maxPlanes: { medium: 3, high: 5 },
    idleAfterHero: true,
  }),
  workshops: definePreset({
    id: "workshops",
    composition: "coordinates",
    cameraZ: 6.2,
    depth: 16,
    accent: "sun",
    maxPlanes: { medium: 4, high: 8 },
    idleAfterHero: false,
  }),
  "workshop-detail": definePreset({
    id: "workshop-detail",
    composition: "coordinates",
    cameraZ: 5.5,
    depth: 13,
    accent: "sun",
    maxPlanes: { medium: 3, high: 5 },
    idleAfterHero: true,
  }),
  shop: definePreset({
    id: "shop",
    composition: "machine",
    cameraZ: 6.3,
    depth: 17,
    accent: "sky",
    maxPlanes: { medium: 4, high: 8 },
    idleAfterHero: false,
  }),
  "shop-detail": definePreset({
    id: "shop-detail",
    composition: "focus",
    cameraZ: 5.4,
    depth: 13,
    accent: "sky",
    maxPlanes: { medium: 3, high: 5 },
    idleAfterHero: true,
  }),
  booking: definePreset({
    id: "booking",
    composition: "shutter",
    cameraZ: 5.8,
    depth: 12,
    accent: "moss",
    maxPlanes: { medium: 2, high: 4 },
    idleAfterHero: false,
  }),
  map: definePreset({
    id: "map",
    composition: "coordinates",
    cameraZ: 6.6,
    depth: 14,
    accent: "sky",
    maxPlanes: { medium: 2, high: 4 },
    idleAfterHero: true,
  }),
  login: definePreset({
    id: "login",
    composition: "focus",
    cameraZ: 5.7,
    depth: 10,
    accent: "coral",
    maxPlanes: { medium: 1, high: 2 },
    idleAfterHero: false,
  }),
  compare: definePreset({
    id: "compare",
    composition: "calibration",
    cameraZ: 5.6,
    depth: 11,
    accent: "sun",
    maxPlanes: { medium: 2, high: 4 },
    idleAfterHero: false,
  }),
  editor: definePreset({
    id: "editor",
    composition: "calibration",
    cameraZ: 5.9,
    depth: 10,
    accent: "sky",
    maxPlanes: { medium: 1, high: 2 },
    idleAfterHero: true,
  }),
  boundary: definePreset({
    id: "boundary",
    composition: "boundary",
    cameraZ: 6.5,
    depth: 9,
    accent: "moss",
    maxPlanes: { medium: 1, high: 2 },
    idleAfterHero: true,
  }),
});

const EXACT_ROUTE_PRESETS: Readonly<Record<string, ScenePresetId>> = Object.freeze({
  "/": "home",
  "/gallery": "gallery",
  "/courses": "courses",
  "/products": "presets",
  "/workshops": "workshops",
  "/shop": "shop",
  "/booking": "booking",
  "/map": "map",
  "/login": "login",
  "/compare": "compare",
  "/editor": "editor",
});

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname || "/";
}

function isExcludedPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/admin" || pathname.startsWith("/admin/");
}

export function resolveRoutePreset(pathname: string): ScenePresetId | null {
  const path = normalizePathname(pathname);
  if (isExcludedPath(path)) return null;

  const exactPreset = EXACT_ROUTE_PRESETS[path];
  if (exactPreset) return exactPreset;

  if (/^\/gallery\/[^/]+$/.test(path)) return "photo-detail";
  if (/^\/courses\/[^/]+$/.test(path)) return "course-detail";
  if (/^\/presets\/[^/]+$/.test(path)) return "preset-detail";
  if (/^\/workshops\/[^/]+$/.test(path)) return "workshop-detail";
  if (/^\/shop\/[^/]+$/.test(path)) return "shop-detail";

  return "boundary";
}
