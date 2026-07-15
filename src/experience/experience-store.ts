import type { ScenePresetId } from "./scene-presets";

export type ExperiencePauseReason = "hidden" | "chat" | "booking" | "lightbox" | "map" | "editor" | "offline";

export type ExperienceAnchor = {
  id: string;
  preset: ScenePresetId;
  imageUrls: string[];
  element?: HTMLElement | null;
};

type RegisteredExperienceAnchor = Readonly<Omit<ExperienceAnchor, "imageUrls">> & {
  readonly imageUrls: readonly string[];
};

export type ExperienceSnapshot = {
  route: ScenePresetId | null;
  anchor: RegisteredExperienceAnchor | null;
  highlightedId: string | null;
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
  setHighlightedId(id: string | null): void;
  setPointer(x: number, y: number): void;
  setScrollProgress(progress: number): void;
  setPaused(reason: ExperiencePauseReason, active: boolean): void;
  setVisible(visible: boolean): void;
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(minimum, value));
}

function createReadonlyPauseReasons(reasons: Iterable<ExperiencePauseReason>): ReadonlySet<ExperiencePauseReason> {
  const values = new Set(reasons);
  const view: ReadonlySet<ExperiencePauseReason> = {
    get size() {
      return values.size;
    },
    has(value) {
      return values.has(value);
    },
    entries: () => values.entries(),
    keys: () => values.keys(),
    values: () => values.values(),
    forEach(callback, thisArg) {
      for (const value of values) callback.call(thisArg, value, value, view);
    },
    [Symbol.iterator]: () => values.values(),
  };
  return Object.freeze(view);
}

function createRegisteredAnchor(anchor: ExperienceAnchor): RegisteredExperienceAnchor {
  return Object.freeze({
    ...anchor,
    imageUrls: Object.freeze([...anchor.imageUrls]),
  }) as RegisteredExperienceAnchor;
}

type SnapshotValues = Omit<ExperienceSnapshot, "pauseReasons"> & {
  pauseReasons: Iterable<ExperiencePauseReason>;
};

function createSnapshot(values: SnapshotValues): ExperienceSnapshot {
  return Object.freeze({
    ...values,
    pauseReasons: createReadonlyPauseReasons(values.pauseReasons),
  });
}

export function createExperienceStore(): ExperienceStore {
  let snapshot = createSnapshot({
    route: null,
    anchor: null,
    highlightedId: null,
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
      const registeredAnchor = createRegisteredAnchor(anchor);
      publish(createSnapshot({ ...snapshot, anchor: registeredAnchor }));

      return () => {
        if (token !== registrationToken || snapshot.anchor !== registeredAnchor) return;
        registrationToken += 1;
        publish(createSnapshot({ ...snapshot, anchor: null }));
      };
    },
    setHighlightedId(id) {
      if (snapshot.highlightedId === id) return;
      publish(createSnapshot({ ...snapshot, highlightedId: id }));
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
