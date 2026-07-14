import type { ScenePresetId } from "./scene-presets";

export type ExperiencePauseReason = "hidden" | "chat" | "booking" | "lightbox" | "map" | "editor" | "offline";

export type ExperienceAnchor = {
  id: string;
  preset: ScenePresetId;
  imageUrls: string[];
  element?: HTMLElement | null;
};

export type ExperienceSnapshot = {
  route: ScenePresetId | null;
  anchor: ExperienceAnchor | null;
  pointerX: number;
  pointerY: number;
  scrollProgress: number;
  visible: boolean;
  paused: boolean;
  pauseReasons: ReadonlySet<ExperiencePauseReason>;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createSnapshot(values: ExperienceSnapshot): ExperienceSnapshot {
  return Object.freeze(values);
}

export function createExperienceStore(): ExperienceStore {
  let snapshot = createSnapshot({
    route: null,
    anchor: null,
    pointerX: 0,
    pointerY: 0,
    scrollProgress: 0,
    visible: true,
    paused: false,
    pauseReasons: new Set(),
  });
  let registrationToken = 0;
  const listeners = new Set<() => void>();

  function publish(nextSnapshot: ExperienceSnapshot): void {
    snapshot = nextSnapshot;
    for (const listener of Array.from(listeners)) listener();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setRoute(preset) {
      if (snapshot.route === preset) return;
      publish(createSnapshot({ ...snapshot, route: preset }));
    },
    registerAnchor(anchor) {
      const token = ++registrationToken;
      const registeredAnchor: ExperienceAnchor = {
        ...anchor,
        imageUrls: [...anchor.imageUrls],
      };
      publish(createSnapshot({ ...snapshot, anchor: registeredAnchor }));

      return () => {
        if (token !== registrationToken || snapshot.anchor !== registeredAnchor) return;
        registrationToken += 1;
        publish(createSnapshot({ ...snapshot, anchor: null }));
      };
    },
    setPointer(x, y) {
      const pointerX = clamp(x, -1, 1);
      const pointerY = clamp(y, -1, 1);
      if (snapshot.pointerX === pointerX && snapshot.pointerY === pointerY) return;
      publish(createSnapshot({ ...snapshot, pointerX, pointerY }));
    },
    setScrollProgress(progress) {
      const scrollProgress = clamp(progress, 0, 1);
      if (snapshot.scrollProgress === scrollProgress) return;
      publish(createSnapshot({ ...snapshot, scrollProgress }));
    },
    setPaused(reason, active) {
      if (snapshot.pauseReasons.has(reason) === active) return;
      const pauseReasons = new Set(snapshot.pauseReasons);
      if (active) pauseReasons.add(reason);
      else pauseReasons.delete(reason);
      publish(createSnapshot({ ...snapshot, pauseReasons, paused: pauseReasons.size > 0 }));
    },
    setVisible(visible) {
      const hiddenPaused = snapshot.pauseReasons.has("hidden");
      if (snapshot.visible === visible && hiddenPaused === !visible) return;

      const pauseReasons = new Set(snapshot.pauseReasons);
      if (visible) pauseReasons.delete("hidden");
      else pauseReasons.add("hidden");
      publish(createSnapshot({
        ...snapshot,
        visible,
        pauseReasons,
        paused: pauseReasons.size > 0,
      }));
    },
  };
}
