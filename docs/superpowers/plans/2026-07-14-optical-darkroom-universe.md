# Optical Darkroom Universe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one adaptive, route-morphing Three.js experience across every public route while preserving the complete static site, all workflows, and measured frame-time budgets.

**Architecture:** A small React experience context publishes route, anchor, pointer, scroll, and pause state without importing Three.js. A single lazy `ImmersiveExperience` owns one raw Three.js renderer and morphs route presets instead of remounting canvases. Pure capability, preset, store, and lifecycle modules remain unit-testable; map, editor, dialogs, hidden tabs, reduced motion, Data Saver, and WebGL failure suspend or skip rendering.

**Tech Stack:** React 19, TypeScript 7, Three.js, Vite 8, GSAP/Lenis integration, Vitest, Playwright, Cloudflare Pages.

## Global Constraints

- `three` is the only new production rendering dependency; do not add React Three Fiber, Drei, post-processing, physics, shader, audio, or asset-hosting packages.
- Three.js must stay behind a lazy dynamic import and outside the initial application bundle.
- Initial application JavaScript may grow by at most 5 KB gzip; the complete lazy immersive chunk must remain at or below 190 KB gzip.
- Keep one live WebGL context. Route changes morph one scene and never stack canvases.
- High tier uses at most 10 photo planes, 48 MB estimated texture memory, and DPR `1.5`; medium uses at most 6 planes, 24 MB, and DPR `1.25`.
- Load at most three route-critical textures before interaction; all other textures are idle-loaded, abortable, and same-origin AVIF/WebP assets.
- High tier targets p95 frame time at or below 20ms; medium targets p95 at or below 28ms. Sustained frame time above 34ms forces a one-way quality downgrade.
- Reduced motion, Data Saver, WebGL failure, and explicit GPU-disabled test policy produce the complete static site without creating a renderer.
- Canvas output is supplementary and `aria-hidden`; every command remains a semantic DOM control.
- Never hijack native scroll, autoplay audio, obscure portrait subjects, place 3D over editor controls, or add decorative glow orbs, generic particle clouds, glass-card stacks, or CSS gradient heroes.
- Dashboard and admin do not run WebGL. Map and editor suspend the renderer while their GPU-heavy work is active.
- Every implementation task follows red-green-refactor, runs its focused gate, and commits only its listed files.

---

## File Map

### Experience Core

- `src/experience/capability-tier.ts`: pure static/medium/high tier selection and browser-signal adapter.
- `src/experience/scene-presets.ts`: route family resolution and immutable scene parameters.
- `src/experience/experience-store.ts`: non-React animation state, pause reasons, anchor registration, and subscriptions.
- `src/experience/resource-registry.ts`: deterministic Three.js resource tracking and disposal.
- `src/experience/texture-pool.ts`: bounded texture reuse, abort, eviction, and estimated-memory accounting.
- `src/experience/optical-geometry.ts`: contact-sheet planes, focus rails, shutter blades, and route-specific geometry groups.
- `src/experience/three-scene-driver.ts`: Three.js renderer, camera, scene morphing, texture binding, and pixel rendering.
- `src/experience/immersive-runtime.ts`: renderer state machine, frame loop, adaptive quality, context loss, and pause orchestration.

### React Integration

- `src/experience/ExperienceProvider.tsx`: stable store context with no Three.js import.
- `src/experience/ImmersiveExperienceGate.tsx`: capability check and idle dynamic import.
- `src/experience/ImmersiveExperience.tsx`: one canvas and one runtime instance.
- `src/experience/useImmersiveAnchor.ts`: DOM anchor registration and intersection/bounds updates.
- `src/experience/useExperiencePause.ts`: explicit pause-reason lifecycle helper.
- `src/components/shared/PageHero.tsx`: optional immersive preset and image descriptor.
- `src/layouts/RootLayout.tsx`: provider, shared canvas, route eligibility, and chat pause signal.
- `src/styles/immersive.css`: full-bleed canvas, static fallback, route scrims, and responsive layer contracts.

### Verification

- `src/experience/*.test.ts`: pure unit and lifecycle tests.
- `src/lib/architecture-contracts.test.ts`: lazy dependency and one-boundary contracts.
- `src/lib/immersive-integration.test.ts`: source-level route coverage and DOM fallback contracts.
- `e2e/immersive-experience.spec.ts`: canvas pixels, route reuse, frame traces, fallback, focus, and pause behavior.
- `scripts/check-performance-budget.mjs`: initial and immersive chunk gzip budgets.

---

### Task 1: Dependency Boundary and Capability Tier

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `src/lib/architecture-contracts.test.ts`
- Create: `src/experience/capability-tier.ts`
- Create: `src/experience/capability-tier.test.ts`

**Interfaces:**
- Produces: `ExperienceTier = "static" | "medium" | "high"`.
- Produces: `CapabilitySignals` and `selectExperienceTier(signals): ExperienceTier`.
- Produces: `readCapabilitySignals(): CapabilitySignals`, which reads browser APIs but never imports Three.js.
- Later tasks consume this tier to cap DPR, texture count, geometry density, and frame frequency.

- [ ] **Step 1: Replace the obsolete no-Three architecture test with a lazy-boundary RED test**

Update the final test in `src/lib/architecture-contracts.test.ts` to assert the new architecture before the files exist:

```ts
it("isolates the immersive Three.js runtime behind one lazy boundary", () => {
  const packageJson = read("package.json");
  const viteConfig = read("vite.config.ts");
  const rootLayout = read("src/layouts/RootLayout.tsx");

  expect(packageJson).toContain('"three"');
  expect(viteConfig).toContain('return "immersive-vendor"');
  expect(viteConfig).toContain("**/immersive-vendor-*.js");
  expect(rootLayout).toContain("<ImmersiveExperienceGate");
  expect(rootLayout).not.toContain('from "three"');
  expect(existsSync(resolve(root, "src/experience/ImmersiveExperience.tsx"))).toBe(true);
});
```

- [ ] **Step 2: Write capability-tier tests**

Create `src/experience/capability-tier.test.ts` with direct pure inputs:

```ts
import { describe, expect, it } from "vitest";
import { selectExperienceTier } from "./capability-tier";

const capable = {
  reducedMotion: false,
  saveData: false,
  webglAvailable: true,
  gpuDisabled: false,
  coarsePointer: false,
  viewportWidth: 1440,
  hardwareConcurrency: 12,
  deviceMemory: 8,
};

describe("selectExperienceTier", () => {
  it.each([
    ["reduced motion", { reducedMotion: true }],
    ["data saver", { saveData: true }],
    ["WebGL failure", { webglAvailable: false }],
    ["test GPU policy", { gpuDisabled: true }],
  ])("selects static for %s", (_label, override) => {
    expect(selectExperienceTier({ ...capable, ...override })).toBe("static");
  });

  it("selects medium for mobile or constrained hardware", () => {
    expect(selectExperienceTier({ ...capable, viewportWidth: 430, coarsePointer: true })).toBe("medium");
    expect(selectExperienceTier({ ...capable, hardwareConcurrency: 4, deviceMemory: 4 })).toBe("medium");
  });

  it("selects high only for a capable desktop", () => {
    expect(selectExperienceTier(capable)).toBe("high");
  });
});
```

- [ ] **Step 3: Run RED tests**

Run: `npm test -- --run src/experience/capability-tier.test.ts src/lib/architecture-contracts.test.ts`

Expected: FAIL because `capability-tier.ts`, `three`, the immersive chunk, and Vite split do not exist.

- [ ] **Step 4: Install Three.js and implement the pure tier selector**

Run: `npm install three`

Create `src/experience/capability-tier.ts` with this public shape and decision order:

```ts
export type ExperienceTier = "static" | "medium" | "high";

export type CapabilitySignals = {
  reducedMotion: boolean;
  saveData: boolean;
  webglAvailable: boolean;
  gpuDisabled: boolean;
  coarsePointer: boolean;
  viewportWidth: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

export function selectExperienceTier(signals: CapabilitySignals): ExperienceTier {
  if (signals.reducedMotion || signals.saveData || !signals.webglAvailable || signals.gpuDisabled) {
    return "static";
  }
  const constrainedCpu = (signals.hardwareConcurrency ?? 8) <= 4;
  const constrainedMemory = (signals.deviceMemory ?? 8) <= 4;
  if (signals.coarsePointer || signals.viewportWidth < 900 || constrainedCpu || constrainedMemory) {
    return "medium";
  }
  return "high";
}
```

`readCapabilitySignals()` must read `matchMedia`, `navigator.connection?.saveData`, `navigator.hardwareConcurrency`, optional `navigator.deviceMemory`, `window.innerWidth`, a `sessionStorage` key named `nhb-disable-webgl`, and a temporary canvas WebGL2/WebGL probe. It removes the probe immediately.

- [ ] **Step 5: Add explicit vendor splitting and prevent PWA eager download**

In `vite.config.ts`, add this before other animation chunks:

```ts
if (id.includes("node_modules/three")) {
  return "immersive-vendor";
}
```

Add `"**/immersive-vendor-*.js"` to Workbox `globIgnores` so static, reduced-motion, and Data Saver sessions do not download Three.js during service-worker installation.

- [ ] **Step 6: Add the minimal lazy-boundary files required by the architecture contract**

Create `src/experience/ImmersiveExperience.tsx` as a temporary non-rendering named component and `src/experience/ImmersiveExperienceGate.tsx` with a dynamic import only after `selectExperienceTier` returns non-static. Render `<ImmersiveExperienceGate />` inside `RootLayout`; Task 4 replaces the temporary body with the real provider/canvas integration.

- [ ] **Step 7: Run GREEN tests and build boundary check**

Run: `npm test -- --run src/experience/capability-tier.test.ts src/lib/architecture-contracts.test.ts`

Expected: PASS.

Run: `npm run lint && npm run build`

Expected: PASS; build output contains `immersive-vendor-*.js`, while the main `index-*.js` remains below the existing budget.

- [ ] **Step 8: Commit Task 1**

```bash
git add package.json package-lock.json vite.config.ts src/lib/architecture-contracts.test.ts src/experience/capability-tier.ts src/experience/capability-tier.test.ts src/experience/ImmersiveExperience.tsx src/experience/ImmersiveExperienceGate.tsx src/layouts/RootLayout.tsx
git commit -m "feat: establish adaptive immersive runtime boundary"
```

---

### Task 2: Scene Presets and Non-React Experience Store

**Files:**
- Create: `src/experience/scene-presets.ts`
- Create: `src/experience/scene-presets.test.ts`
- Create: `src/experience/experience-store.ts`
- Create: `src/experience/experience-store.test.ts`

**Interfaces:**
- Consumes: `ExperienceTier` from Task 1.
- Produces: `ScenePresetId`, `ScenePreset`, `resolveRoutePreset(pathname)`, and `SCENE_PRESETS`.
- Produces: `ExperienceAnchor`, `ExperiencePauseReason`, `ExperienceSnapshot`, and `createExperienceStore()`.
- Later React and renderer tasks share exactly one store instance through context.

- [ ] **Step 1: Write route-preset RED tests**

Create `src/experience/scene-presets.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Write store RED tests**

Create `src/experience/experience-store.test.ts` to prove snapshot stability and independent pause reasons:

```ts
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
});
```

- [ ] **Step 3: Run RED tests**

Run: `npm test -- --run src/experience/scene-presets.test.ts src/experience/experience-store.test.ts`

Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement immutable route presets**

Define `ScenePresetId` as the 17 IDs asserted above. Define `ScenePreset` with:

```ts
export type ScenePreset = {
  id: ScenePresetId;
  composition: "tunnel" | "archive" | "focus" | "machine" | "coordinates" | "shutter" | "calibration" | "boundary";
  cameraZ: number;
  depth: number;
  accent: "moss" | "coral" | "sun" | "sky";
  maxPlanes: { medium: number; high: number };
  idleAfterHero: boolean;
};
```

Populate every ID with explicit values. Cap every `maxPlanes.high` at 10 and every `maxPlanes.medium` at 6. `map` and `editor` set `idleAfterHero: true`. `resolveRoutePreset()` checks dashboard/admin exclusions first, then exact index paths before dynamic detail patterns, and returns `boundary` for unmatched public paths.

- [ ] **Step 5: Implement the store with exact public methods**

```ts
export type ExperiencePauseReason = "hidden" | "chat" | "booking" | "lightbox" | "map" | "editor" | "offline";

export type ExperienceAnchor = {
  id: string;
  preset: ScenePresetId;
  imageUrls: string[];
  element?: HTMLElement | null;
};

export type ExperienceStore = {
  getSnapshot(): ExperienceSnapshot;
  subscribe(listener: () => void): () => void;
  setRoute(preset: ScenePresetId | null): void;
  registerAnchor(anchor: ExperienceAnchor): () => void;
  setPointer(x: number, y: number): void;
  setScrollProgress(progress: number): void;
  setPaused(reason: ExperiencePauseReason, active: boolean): void;
  setVisible(visible: boolean): void;
};
```

Clamp pointer to `[-1, 1]`, scroll progress to `[0, 1]`, copy pause reasons before mutation, and compare scalar values before notifying. Anchor cleanup captures a monotonically increasing registration token so stale cleanup cannot clear a newer anchor.

- [ ] **Step 6: Run GREEN tests and type checking**

Run: `npm test -- --run src/experience/scene-presets.test.ts src/experience/experience-store.test.ts && npm run lint`

Expected: all tests PASS and TypeScript exits `0`.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/experience/scene-presets.ts src/experience/scene-presets.test.ts src/experience/experience-store.ts src/experience/experience-store.test.ts
git commit -m "feat: define immersive route scenes and state"
```

---

### Task 3: Resource Registry, Texture Pool, and Renderer State Machine

**Files:**
- Create: `src/experience/resource-registry.ts`
- Create: `src/experience/resource-registry.test.ts`
- Create: `src/experience/texture-pool.ts`
- Create: `src/experience/texture-pool.test.ts`
- Create: `src/experience/optical-geometry.ts`
- Create: `src/experience/three-scene-driver.ts`
- Create: `src/experience/immersive-runtime.ts`
- Create: `src/experience/immersive-runtime.test.ts`

**Interfaces:**
- Consumes: `ExperienceTier`, `ScenePreset`, and `ExperienceStore`.
- Produces: `ResourceRegistry`, `TexturePool`, `SceneDriver`, and `ImmersiveRuntime`.
- `SceneDriver` is mockable; unit tests do not require a browser WebGL context.

- [ ] **Step 1: Write RED disposal and pool tests**

`resource-registry.test.ts` registers fake objects exposing `dispose()` and asserts each unique object is disposed exactly once in reverse registration order.

`texture-pool.test.ts` uses an injected async loader and proves:

```ts
it("reuses pending and fulfilled textures by URL");
it("aborts obsolete loads without caching stale completions");
it("evicts least-recently-used textures within the tier byte budget");
it("disposes every cached texture exactly once");
```

The pool constructor is:

```ts
new TexturePool<TextureLike>({
  maxBytes: 24 * 1024 * 1024,
  load: async (url, signal) => ({ value, width, height, bytes }),
  dispose: (value) => value.dispose(),
});
```

- [ ] **Step 2: Write RED runtime tests around a fake driver**

Define a fake `SceneDriver` and verify:

```ts
it("creates one driver, morphs presets, and never recreates it for route changes");
it("requests no frames while hidden, paused, static, or disposed");
it("downgrades high to medium after the 34ms sustained threshold");
it("allows one context restore and locks static after repeated loss");
it("disposes driver, textures, subscriptions, and scheduled frames");
```

Use an injected scheduler:

```ts
type FrameScheduler = {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
  now(): number;
};
```

- [ ] **Step 3: Run RED tests**

Run: `npm test -- --run src/experience/resource-registry.test.ts src/experience/texture-pool.test.ts src/experience/immersive-runtime.test.ts`

Expected: FAIL because the modules are missing.

- [ ] **Step 4: Implement deterministic resource ownership**

`ResourceRegistry` stores unique resources in insertion order, accepts a disposer callback when a resource lacks a standard `dispose()`, and empties itself after reverse-order disposal.

`TexturePool` stores `{ promise, value, bytes, lastUsed, controller }` per normalized same-origin URL. `acquire(url)` reuses the entry and updates `lastUsed`. `retain(urls)` aborts pending entries not in the retained set, then evicts fulfilled least-recently-used entries until `totalBytes <= maxBytes`. `dispose()` aborts pending loads and disposes fulfilled values once.

- [ ] **Step 5: Implement optical geometry factories**

`optical-geometry.ts` exports:

```ts
export function createContactSheetGroup(planeCount: number): THREE.Group;
export function createFocusRailGroup(): THREE.Group;
export function createShutterGroup(bladeCount?: number): THREE.Group;
export function applyPresetGeometry(group: THREE.Group, preset: ScenePreset, progress: number): void;
```

Use `PlaneGeometry`, `BufferGeometry` line segments, `MeshBasicMaterial`, and `LineBasicMaterial`. Do not create spheres, particle systems, bloom, shadow maps, environment maps, or post-processing passes. Every created geometry and material is registered for disposal.

- [ ] **Step 6: Implement the Three.js scene driver**

`three-scene-driver.ts` creates one `WebGLRenderer` with `alpha: true`, `antialias: false`, and `powerPreference: "high-performance"`. It sets sRGB output, disables shadows, caps pixel ratio from the tier, and owns one perspective camera and root scene group.

Expose this exact interface:

```ts
export type SceneDriver = {
  setTier(tier: Exclude<ExperienceTier, "static">): void;
  setSize(width: number, height: number): void;
  morphTo(preset: ScenePreset, imageUrls: string[]): Promise<void>;
  render(frame: { time: number; delta: number; pointerX: number; pointerY: number; scrollProgress: number }): void;
  suspend(): void;
  resume(): void;
  samplePixels(): Promise<Uint8Array>;
  dispose(): void;
};
```

`morphTo` reuses geometry groups and textures, limits plane count through `preset.maxPlanes[tier]`, cancels obsolete texture work, and keeps old planes visible until at least one new texture is ready. Failed textures use an untextured ink frame.

- [ ] **Step 7: Implement the runtime state machine**

`ImmersiveRuntime` subscribes once to the store, creates one driver, owns one frame scheduler, tracks a rolling 120-frame duration window, and downgrades high to medium when at least 45 recent frames exceed 34ms. A downgrade changes DPR, plane count, texture budget, and frame target but never upgrades in the same session.

State transitions must be explicit: `booting -> active -> idle/suspended -> active -> disposed`, with a terminal `static` state after repeated context loss. `visibilitychange`, store pause reasons, and anchor intersection determine whether another frame is requested.

- [ ] **Step 8: Run GREEN tests, lint, and focused build**

Run: `npm test -- --run src/experience/resource-registry.test.ts src/experience/texture-pool.test.ts src/experience/immersive-runtime.test.ts && npm run lint && npm run build`

Expected: all commands PASS; no WebGL unit test requires a real GPU.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/experience/resource-registry.ts src/experience/resource-registry.test.ts src/experience/texture-pool.ts src/experience/texture-pool.test.ts src/experience/optical-geometry.ts src/experience/three-scene-driver.ts src/experience/immersive-runtime.ts src/experience/immersive-runtime.test.ts
git commit -m "feat: build disposable immersive scene runtime"
```

---

### Task 4: React Provider, Lazy Canvas, Anchors, and Shared Styling

**Files:**
- Create: `src/experience/ExperienceProvider.tsx`
- Create: `src/experience/useImmersiveAnchor.ts`
- Create: `src/experience/useExperiencePause.ts`
- Modify: `src/experience/ImmersiveExperienceGate.tsx`
- Modify: `src/experience/ImmersiveExperience.tsx`
- Modify: `src/layouts/RootLayout.tsx`
- Modify: `src/components/shared/PageHero.tsx`
- Create: `src/styles/immersive.css`
- Modify: `src/styles/site.css`
- Create: `src/lib/immersive-integration.test.ts`

**Interfaces:**
- Consumes: capability tier, store, presets, and runtime from Tasks 1-3.
- Produces: `ExperienceProvider`, `useExperienceStore`, `useImmersiveAnchor`, and `useExperiencePause`.
- Produces optional `PageHero` props `immersivePreset` and `immersiveImages`.

- [ ] **Step 1: Write RED integration contracts**

Create `src/lib/immersive-integration.test.ts` and assert:

```ts
expect(read("src/layouts/RootLayout.tsx")).toContain("<ExperienceProvider>");
expect(read("src/layouts/RootLayout.tsx")).toContain("<ImmersiveExperienceGate");
expect(read("src/experience/ImmersiveExperienceGate.tsx")).toContain('import("./ImmersiveExperience")');
expect(read("src/experience/ImmersiveExperience.tsx")).toContain('aria-hidden="true"');
expect(read("src/components/shared/PageHero.tsx")).toContain("useImmersiveAnchor");
expect(read("src/styles/site.css")).toContain('@import "./immersive.css"');
expect(read("src/styles/immersive.css")).toContain("pointer-events: none");
```

Add a second test proving no experience file imported by `RootLayout` contains `from "three"` except the dynamic `ImmersiveExperience` branch.

- [ ] **Step 2: Run RED test**

Run: `npm test -- --run src/lib/immersive-integration.test.ts`

Expected: FAIL because provider, hooks, styles, and PageHero integration do not exist.

- [ ] **Step 3: Implement the provider and hooks**

`ExperienceProvider` creates one store in a ref and exposes it through context. `useExperienceStore()` throws a direct error when called outside the provider.

`useImmersiveAnchor({ id, preset, imageUrls })` returns a callback ref. On attach it registers the element, uses `IntersectionObserver` to publish visibility, uses one passive scroll listener coalesced through `requestAnimationFrame` to publish normalized progress, and disposes observers/listeners/frames on detach. Memoize image URL arrays at call sites so registration does not churn.

`useExperiencePause(reason, active)` calls `store.setPaused(reason, active)` in an effect and clears that reason during cleanup.

- [ ] **Step 4: Implement the lazy gate and canvas**

The gate reads capability signals before importing Three.js. For medium/high it schedules the dynamic import through the existing `scheduleIdleTask` helper with a 120ms timeout, but immediately loads after the first pointer, focus, or scroll input. Static tier returns `null` and does not request the immersive chunk.

`ImmersiveExperience` renders:

```tsx
<div className={`immersive-experience immersive-experience--${tier}`} aria-hidden="true">
  <canvas ref={canvasRef} className="immersive-experience-canvas" tabIndex={-1} />
</div>
```

It constructs one runtime when canvas/tier/store are ready, forwards resize through `ResizeObserver`, listens for `webglcontextlost/restored`, and calls `runtime.dispose()` exactly once on cleanup.

- [ ] **Step 5: Integrate RootLayout without disturbing provider order**

Place `ExperienceProvider` inside `PublicPhotosProvider` and around Header, main, chat, footer, and the immersive gate. Publish route preset on `location.pathname`; set `hidden` from `document.visibilityState`; set `chat` from `chatOpen`; exclude dashboard and admin through `resolveRoutePreset`. Keep editor chat behavior unchanged.

- [ ] **Step 6: Extend PageHero with an anchor descriptor**

Add typed optional props:

```ts
immersivePreset?: ScenePresetId;
immersiveImages?: string[];
```

Register the existing `<section>` through `useImmersiveAnchor` when both are present. Preserve the current `<picture>`, image alt text, heading order, dimensions, and fetch priority as the complete static fallback.

- [ ] **Step 7: Add shared canvas CSS**

`immersive.css` makes one fixed full-viewport layer behind public hero DOM, sets stable `100dvh` geometry, no pointer events, no layout contribution, and controlled opacity only when `html` has `data-immersive-ready="true"`. Hero sections remain full-bleed and unframed. Opaque content bands cover the canvas below the hero. Reduced-motion rules hide the canvas without transitions.

- [ ] **Step 8: Run GREEN contracts and regression gate**

Run: `npm test -- --run src/lib/immersive-integration.test.ts src/lib/architecture-contracts.test.ts && npm run lint && npm run build`

Expected: PASS; static DOM renders if the lazy chunk is blocked.

- [ ] **Step 9: Commit Task 4**

```bash
git add src/experience/ExperienceProvider.tsx src/experience/useImmersiveAnchor.ts src/experience/useExperiencePause.ts src/experience/ImmersiveExperienceGate.tsx src/experience/ImmersiveExperience.tsx src/layouts/RootLayout.tsx src/components/shared/PageHero.tsx src/styles/immersive.css src/styles/site.css src/lib/immersive-integration.test.ts
git commit -m "feat: mount one adaptive immersive canvas"
```

---

### Task 5: Home, Gallery, and Photo Detail Flagship Scenes

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/GalleryPage.tsx`
- Modify: `src/pages/PhotoDetailPage.tsx`
- Modify: `src/components/Gallery.tsx`
- Modify: `src/styles/hero.css`
- Modify: `src/styles/gallery.css`
- Modify: `src/styles/pages.css`
- Modify: `src/lib/immersive-integration.test.ts`
- Create: `e2e/immersive-experience.spec.ts`

**Interfaces:**
- Consumes: `useImmersiveAnchor`, scene preset IDs, and experience store.
- Produces: flagship `home`, `gallery`, and `photo-detail` descriptors and DOM-to-scene highlight IDs.

- [ ] **Step 1: Write RED route coverage and browser tests**

Extend `immersive-integration.test.ts` to require `useImmersiveAnchor` in all three pages and require Gallery to publish active filter/highlight state without importing Three.js.

Create `e2e/immersive-experience.spec.ts` with mocked public APIs and a normal-motion 1440x900 context. Assert:

```ts
await page.goto("/");
await expect(page.locator(".immersive-experience-canvas")).toHaveCount(1);
await expect(page.locator("[data-immersive-anchor='home']")).toBeVisible();
expect(await sampleCanvas(page)).toMatchObject({ nonTransparentPixels: expect.any(Number) });
expect((await sampleCanvas(page)).nonTransparentPixels).toBeGreaterThan(500);
```

Navigate `/ -> /gallery -> /gallery/gallery-urban-01` through DOM links and assert the same canvas element survives, its `data-scene-preset` changes, no second canvas appears, and headings/actions remain visible.

- [ ] **Step 2: Run RED tests**

Run: `npm test -- --run src/lib/immersive-integration.test.ts`

Expected: FAIL on missing page anchors.

Run: `npx playwright test e2e/immersive-experience.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: FAIL because the flagship scenes are not registered/rendered.

- [ ] **Step 3: Register the home portrait tunnel**

Memoize the first three public photo URLs and attach `useImmersiveAnchor({ id: "home-hero", preset: "home", imageUrls })` to `.hero-home`. Preserve the contact-sheet DOM media until `data-immersive-ready` is true, then lower only supporting-image opacity; never remove the real hero image or brand H1.

Map scroll progress to camera depth through the store. The hero remains short enough for `.home-index-strip` to appear in the first 622px desktop viewport.

- [ ] **Step 4: Register gallery archive and DOM highlights**

Attach `gallery` to the gallery hero with up to six current filtered photo URLs. Extend Gallery's existing filter and focused-card state to call `store.setHighlightedId(photo.id | null)`; add this method and snapshot field to the Task 2 store with focused RED/GREEN unit assertions. Keyboard focus and pointer hover publish the same ID.

- [ ] **Step 5: Register photo-detail focus scene**

Attach `photo-detail` to the primary media stage with the selected image first and related images after it. The DOM detail image remains fetch-priority high and is never hidden until the scene has rendered a nonblank frame.

- [ ] **Step 6: Add route-specific composition styles**

Use solid scrims, contact-sheet rules, and transparent hero media only after readiness. Do not add gradient backgrounds. Ensure all fixed canvas layers remain behind header, text, lightbox, booking modal, chat, mobile navigation, and scroll controls.

- [ ] **Step 7: Run GREEN tests and flagship screenshots**

Run: `npm test -- --run src/experience src/lib/immersive-integration.test.ts`

Run: `npm run build && npx playwright test e2e/immersive-experience.spec.ts e2e/editorial-public-pages.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: PASS. Capture 1440x900 and 375x812 screenshots for home, gallery, and photo detail; inspect that canvas pixels are nonblank, portraits remain recognizable, text is unobscured, and mobile controls do not overlap.

- [ ] **Step 8: Commit Task 5**

```bash
git add src/pages/HomePage.tsx src/pages/GalleryPage.tsx src/pages/PhotoDetailPage.tsx src/components/Gallery.tsx src/styles/hero.css src/styles/gallery.css src/styles/pages.css src/lib/immersive-integration.test.ts e2e/immersive-experience.spec.ts src/experience/experience-store.ts src/experience/experience-store.test.ts
git commit -m "feat: launch immersive portrait archive scenes"
```

---

### Task 6: Catalogue Index and Detail Scene Coverage

**Files:**
- Modify: `src/pages/CoursesPage.tsx`
- Modify: `src/pages/CourseDetailPage.tsx`
- Modify: `src/pages/ProductsPage.tsx`
- Modify: `src/pages/PresetDetailPage.tsx`
- Modify: `src/pages/WorkshopsPage.tsx`
- Modify: `src/pages/WorkshopDetailPage.tsx`
- Modify: `src/pages/ShopPage.tsx`
- Modify: `src/pages/ShopDetailPage.tsx`
- Modify: `src/styles/pages.css`
- Modify: `src/lib/immersive-integration.test.ts`
- Modify: `e2e/immersive-experience.spec.ts`

**Interfaces:**
- Consumes: PageHero immersive props, detail-page anchor hook, and highlight store field.
- Produces: complete catalogue route-scene coverage with semantic DOM lists remaining authoritative.

- [ ] **Step 1: Write RED source coverage matrix**

Add a table-driven test that reads all eight page files and requires their exact preset ID:

```ts
const coverage = {
  "src/pages/CoursesPage.tsx": "courses",
  "src/pages/CourseDetailPage.tsx": "course-detail",
  "src/pages/ProductsPage.tsx": "presets",
  "src/pages/PresetDetailPage.tsx": "preset-detail",
  "src/pages/WorkshopsPage.tsx": "workshops",
  "src/pages/WorkshopDetailPage.tsx": "workshop-detail",
  "src/pages/ShopPage.tsx": "shop",
  "src/pages/ShopDetailPage.tsx": "shop-detail",
};
for (const [file, preset] of Object.entries(coverage)) {
  expect(read(file)).toContain(`immersivePreset="${preset}"`);
}
```

Detail pages with custom heroes may use `preset: "..."` through `useImmersiveAnchor`; make the assertion accept one of those two exact forms.

- [ ] **Step 2: Add RED browser route matrix**

For each catalogue route in the existing `publicRoutes`, navigate, wait for `data-scene-preset`, sample nonblank pixels, assert one canvas, and run the existing overflow/action check. Hover and keyboard-focus the first catalogue card and assert `data-highlighted-id` changes to its item ID.

- [ ] **Step 3: Run RED tests**

Run: `npm test -- --run src/lib/immersive-integration.test.ts`

Run: `npx playwright test e2e/immersive-experience.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: FAIL on the first uncovered catalogue route.

- [ ] **Step 4: Wire index PageHero descriptors**

Use these exact PageHero mappings and current API/static image values:

```tsx
<PageHero immersivePreset="courses" immersiveImages={courseCoverUrls} ... />
<PageHero immersivePreset="presets" immersiveImages={presetPreviewUrls} ... />
<PageHero immersivePreset="workshops" immersiveImages={workshopCoverUrls} ... />
<PageHero immersivePreset="shop" immersiveImages={merchandiseImageUrls} ... />
```

Memoize URL arrays, filter empty/non-public values, and cap source arrays at ten before the runtime applies its tier cap.

- [ ] **Step 5: Wire custom detail anchors**

Attach each detail preset to its existing dominant media/summary stage. Publish related-card hover/focus IDs to the store. Keep price, schedule, download, registration, inquiry, capacity, and back navigation entirely in DOM controls.

- [ ] **Step 6: Implement preset-specific optical behavior**

In `applyPresetGeometry`, courses use focus rails, presets offset RGB planes by at most 0.018 world units, workshops add line-based coordinates/date markers, and shop uses a bounded horizontal product rail. These branches reuse existing geometry/material pools and create no continuous particle simulation.

- [ ] **Step 7: Run GREEN unit, build, and catalogue E2E gates**

Run: `npm test -- --run src/experience src/lib/immersive-integration.test.ts && npm run lint && npm run build`

Run: `npx playwright test e2e/immersive-experience.spec.ts e2e/editorial-catalogue.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: PASS for all index/detail data, error, filter, registration, and responsive flows.

- [ ] **Step 8: Commit Task 6**

```bash
git add src/pages/CoursesPage.tsx src/pages/CourseDetailPage.tsx src/pages/ProductsPage.tsx src/pages/PresetDetailPage.tsx src/pages/WorkshopsPage.tsx src/pages/WorkshopDetailPage.tsx src/pages/ShopPage.tsx src/pages/ShopDetailPage.tsx src/styles/pages.css src/lib/immersive-integration.test.ts e2e/immersive-experience.spec.ts src/experience/optical-geometry.ts
git commit -m "feat: extend optical scenes across catalogues"
```

---

### Task 7: Booking, Map, Compare, Login, Editor, and Boundary Pauses

**Files:**
- Modify: `src/hooks/useBookingModal.tsx`
- Modify: `src/components/Lightbox.tsx`
- Modify: `src/pages/BookingPage.tsx`
- Modify: `src/pages/MapPage.tsx`
- Modify: `src/pages/ComparePage.tsx`
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/PhotoEditorPage.tsx`
- Modify: `src/pages/PhotoEditorWorkspace.tsx`
- Modify: `src/components/NotFound.tsx`
- Modify: `src/styles/pages.css`
- Modify: `src/lib/immersive-integration.test.ts`
- Modify: `e2e/immersive-experience.spec.ts`

**Interfaces:**
- Consumes: `useExperiencePause`, anchor hook, scene presets, and store.
- Extends: `BookingContextValue` with read-only `isBookingOpen: boolean`.
- Produces: explicit pause behavior for booking, lightbox, map, and editor activity.

- [ ] **Step 1: Write RED pause and coverage contracts**

Require every listed public page/boundary to publish its preset. Require `useBookingModal.tsx` to expose `isBookingOpen`, Lightbox to call `useExperiencePause("lightbox", true)`, Map to use `"map"`, and editor workspace to use `"editor"` while image processing/canvas work is active.

Extend store unit tests to prove simultaneous `booking`, `chat`, and `hidden` reasons cannot resume early.

- [ ] **Step 2: Write RED browser pause tests**

In Playwright expose runtime diagnostics only in non-production test mode through `window.__nhbExperience` with `{ status, tier, frameCount, contextCount, textureBytes, preset }`.

Test these exact transitions:

```ts
await page.goto("/booking");
await page.locator(".booking-quick-cta-btn").click();
await expect.poll(() => diagnostics(page, "status")).toBe("suspended");
await page.keyboard.press("Escape");
await expect.poll(() => diagnostics(page, "status")).toBe("active");
```

Repeat for gallery lightbox. On `/map`, scroll the Leaflet stage into view and assert suspended. On `/editor`, upload the tracked fixture and assert suspended while the editing canvas is active. Verify normal DOM interactions still complete.

- [ ] **Step 3: Run RED tests**

Run: `npm test -- --run src/experience src/lib/immersive-integration.test.ts`

Run: `npx playwright test e2e/immersive-experience.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: FAIL on missing pause integrations and route anchors.

- [ ] **Step 4: Expose booking state without changing call sites**

Extend `BookingContextValue` to `{ openBookingModal(packageName?: string): void; isBookingOpen: boolean }`. Preserve `openBookingModal` identity and existing consumers. A small coordinator inside the provider tree calls `useExperiencePause("booking", isBookingOpen)`.

- [ ] **Step 5: Add task-route anchors and suspension**

- Booking PageHero uses `booking` and up to three package/public-photo images.
- Map PageHero uses `map`; an IntersectionObserver pauses while `.photo-map-stage` is visible.
- Compare primary stage uses `compare` and selected comparison image URLs.
- Login background uses `login` with one portrait and no interactive canvas controls.
- Editor route entrance uses `editor`; once the upload/editor workspace is active, pause and release transient scene textures before face-api loads.
- NotFound uses `boundary` and an empty frame when no image exists.

- [ ] **Step 6: Pause global overlays explicitly**

Lightbox publishes `lightbox` for its mounted lifetime. RootLayout publishes `chat` while chat is open and `hidden` from visibility changes. Offline state publishes `offline` only when the offline fallback blocks interaction. Every effect clears only its own reason.

- [ ] **Step 7: Run GREEN workflow and pause tests**

Run: `npm test -- --run src/experience src/lib/immersive-integration.test.ts src/lib/audit-regressions.test.ts && npm run lint && npm run build`

Run: `npx playwright test e2e/immersive-experience.spec.ts e2e/booking.spec.ts e2e/editorial-workspaces.spec.ts e2e/smoke.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: PASS; diagnostics show one context, correct pause/resume, and existing booking/editor/map/lightbox flows remain usable.

- [ ] **Step 8: Commit Task 7**

```bash
git add src/hooks/useBookingModal.tsx src/components/Lightbox.tsx src/pages/BookingPage.tsx src/pages/MapPage.tsx src/pages/ComparePage.tsx src/pages/LoginPage.tsx src/pages/PhotoEditorPage.tsx src/pages/PhotoEditorWorkspace.tsx src/components/NotFound.tsx src/styles/pages.css src/lib/immersive-integration.test.ts e2e/immersive-experience.spec.ts src/layouts/RootLayout.tsx
git commit -m "feat: coordinate immersive scenes with public workflows"
```

---

### Task 8: Adaptive Performance, Static Fallback, and Visual Acceptance

**Files:**
- Modify: `scripts/check-performance-budget.mjs`
- Modify: `src/experience/immersive-runtime.ts`
- Modify: `src/experience/three-scene-driver.ts`
- Modify: `src/experience/capability-tier.ts`
- Modify: `src/styles/immersive.css`
- Modify: `src/styles/hero.css`
- Modify: `src/styles/pages.css`
- Modify: `e2e/immersive-experience.spec.ts`
- Modify: `e2e/editorial-responsive.spec.ts`
- Modify: `src/lib/performance.test.ts`

**Interfaces:**
- Consumes: complete route coverage and diagnostics from Tasks 1-7.
- Produces: enforceable gzip, context-count, canvas-pixel, frame-time, fallback, responsive, and accessibility gates.

- [ ] **Step 1: Write RED bundle-budget tests**

Extend `src/lib/performance.test.ts` to require `check-performance-budget.mjs` to contain:

```ts
expect(script).toContain("maxInitialGrowthGzipBytes");
expect(script).toContain("maxImmersiveGzipBytes");
expect(script).toContain("190 * 1024");
expect(script).toContain("immersive-vendor");
```

Store the pre-Three main gzip baseline (`29_560` bytes from commit `4875f54`) as `baselineMainGzipBytes` and permit at most `5 * 1024` bytes growth.

- [ ] **Step 2: Write RED frame, fallback, and context browser tests**

Add Playwright helpers:

```ts
async function sampleCanvas(page: Page) {
  return page.locator(".immersive-experience-canvas").evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return { nonTransparentPixels: 0, variedPixels: 0 };
    const width = Math.min(canvas.width, 96);
    const height = Math.min(canvas.height, 96);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let nonTransparentPixels = 0;
    const colors = new Set<string>();
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 0) nonTransparentPixels += 1;
      colors.add(`${pixels[index]}:${pixels[index + 1]}:${pixels[index + 2]}:${pixels[index + 3]}`);
    }
    return { nonTransparentPixels, variedPixels: colors.size };
  });
}
```

Test high-tier p95 from diagnostics after a controlled 6-second hero trace, medium p95 at 430px, one context after cycling every public route twice, reduced-motion no canvas, `sessionStorage.nhb-disable-webgl = "1"` no canvas, Data Saver static through an init-script signal, and no horizontal overflow/fixed-layer collision at all six widths.

- [ ] **Step 3: Run RED performance tests**

Run: `npm test -- --run src/lib/performance.test.ts`

Run: `npm run build && npm run perf:budget`

Run: `npx playwright test e2e/immersive-experience.spec.ts e2e/editorial-responsive.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: at least the new gzip and frame/fallback assertions FAIL.

- [ ] **Step 4: Enforce gzip budgets in the build script**

Use `gzipSync` from `node:zlib` to measure main JS and the combined `immersive-vendor` plus `ImmersiveExperience` chunks. Fail when main gzip exceeds `baselineMainGzipBytes + 5 * 1024` or immersive gzip exceeds `190 * 1024`. Continue enforcing existing raw main/lazy/CSS/font budgets and print both raw and gzip evidence.

- [ ] **Step 5: Tune runtime adaptivity from measured traces**

Cap high/medium DPR and planes at the global values, use a 120-frame ring buffer, compute p95 without sorting the live buffer in every frame, and downgrade after sustained threshold evidence. Active hero renders at display cadence; medium may render every other callback only when measured frame time requires it. Idle scenes render on store/resize/route changes and otherwise request no frame. Hidden/suspended states cancel the pending frame immediately.

- [ ] **Step 6: Complete static and responsive styling**

At static tier, existing hero pictures remain fully opaque and all route content is identical to a blocked immersive chunk. At medium tier, mobile uses one dominant portrait, one supporting plane, and shutter/focus geometry with shallower depth. Ensure every hero still hints at the next section, text contrast uses a solid scrim, and no canvas or fixed control overlaps navigation/actions.

- [ ] **Step 7: Run GREEN performance and visual gates**

Run: `npm test -- --run src/experience src/lib/performance.test.ts src/lib/immersive-integration.test.ts`

Run: `npm run lint && npm run build && npm run perf:budget && npm run bundle:analyze`

Run: `npx playwright test e2e/immersive-experience.spec.ts e2e/editorial-responsive.spec.ts -c e2e/playwright.config.ts --workers=1`

Expected: all gates PASS. Save normal-motion desktop/mobile and reduced/static screenshots. Inspect original-resolution images and verify nonblank canvas, correct framing, recognizable photos, no text occlusion, and no overlapping controls.

- [ ] **Step 8: Commit Task 8**

```bash
git add scripts/check-performance-budget.mjs src/experience/immersive-runtime.ts src/experience/three-scene-driver.ts src/experience/capability-tier.ts src/styles/immersive.css src/styles/hero.css src/styles/pages.css e2e/immersive-experience.spec.ts e2e/editorial-responsive.spec.ts src/lib/performance.test.ts
git commit -m "perf: enforce adaptive immersive experience budgets"
```

---

### Task 9: Full Regression, Release, CI, and Production Acceptance

**Files:**
- Modify only when a failing gate exposes a root-cause fix in an already-owned file.
- Do not stage: `.agent/orchestrator-history/campaign-015/`
- Do not stage: `.agent/orchestrator-history/campaign-016/`

**Interfaces:**
- Consumes: all prior task deliverables.
- Produces: one verified `main` release, green GitHub Actions, current Cloudflare production deployment, and live custom-domain evidence.

- [ ] **Step 1: Audit the complete diff and dependency boundary**

Run:

```bash
git status -sb
git diff --check
git diff --stat 4875f54..HEAD
git diff --name-status 4875f54..HEAD
```

Expected: only planned product, test, dependency, style, script, spec, and plan files; the two campaign directories remain untracked and unstaged.

- [ ] **Step 2: Run the complete local verification ladder**

Run in this order:

```bash
npm run lint
npm test
npm run build:full
npm run test:e2e
```

Expected: TypeScript exits `0`; all Vitest files pass; production build, performance budget, and bundle analysis pass; the complete Playwright suite including immersive tests passes.

- [ ] **Step 3: Restore generated acceptance artifacts**

Run `git status --short`. Restore only generated sitemap timestamp changes and the tracked Playwright editor fixture if the verification commands changed or removed them. Re-run `git diff --check` and confirm no generated output is staged.

- [ ] **Step 4: Perform final real-browser acceptance**

Start the production build locally and inspect `375x812`, `768x1024`, `1440x900`, and `1920x1080` in normal motion, plus `375` and `1440` reduced motion. Capture screenshots of home, gallery, one catalogue, one detail, booking, map, compare, login, and editor. Verify canvas pixels, frame diagnostics, controls, focus, touch, scroll, route transitions, no errors, and one context.

- [ ] **Step 5: Commit any final root-cause corrections**

If Step 2 or 4 required fixes, stage only their exact files and commit with a focused message. Re-run the gate that exposed the issue and the complete affected E2E file before proceeding.

- [ ] **Step 6: Push main and watch GitHub Actions**

```bash
git push origin main
gh run list --commit "$(git rev-parse HEAD)" --limit 5 --json databaseId,status,conclusion,url
gh run watch <run-id> --exit-status --interval 5
```

Expected: remote `main` equals local HEAD and CI completes with `success` for install, lint, unit tests, build, and performance budget.

- [ ] **Step 7: Verify Cloudflare production and custom domain**

```bash
npx wrangler pages deployment list --project-name naihuangbao-photography
curl.exe -sS -D - -o NUL -H "Cache-Control: no-cache" "https://shoot.custard.top/?release=$(git rev-parse --short HEAD)"
curl.exe -sS -D - "https://shoot.custard.top/api/health"
```

Expected: newest Production deployment source equals HEAD short SHA; custom domain returns `200` and current asset hashes; health returns `{"ok":true,"status":"healthy","service":"naihuangbao-photography"}`.

- [ ] **Step 8: Run live desktop/mobile interaction probes**

In clean browser contexts, verify home route scene, gallery filter morph, catalogue focus highlight, review/quiz/booking interactions, map suspension, editor suspension, reduced-motion static fallback, desktop/mobile overflow, and empty console/page-error arrays. Save the final live screenshots and report frame diagnostics, CI URL, deployment ID, commit SHA, remaining non-blocking risks, and untouched untracked directories.

---

## Plan Completion Evidence

The plan is complete only when every checkbox is checked, each task commit exists,
the release gates pass on the final code rather than an earlier revision, GitHub
Actions is green for that exact SHA, Cloudflare Production reports the same SHA,
and the live custom domain demonstrates the immersive scenes and static fallbacks
without runtime errors or workflow regressions.
