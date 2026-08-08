import { TexturePool, type TextureLease } from "./texture-pool";

export type IdleScheduler = {
  request(callback: () => void): number;
  cancel(id: number): void;
};

export type TextureMorphCoordinatorOptions<T> = {
  pool: TexturePool<T>;
  idleScheduler: IdleScheduler;
  onCommit(slots: ReadonlyArray<T | null>): void;
  onUpdate(index: number, value: T | null): void;
  onError?(error: unknown): void;
};

export type MorphCandidate = {
  index: number;
  url: string;
};

export type VisibleResource = MorphCandidate & {
  lease: TextureLease;
};

export type IdleWork<T> = {
  version: number;
  candidates: MorphCandidate[];
  slots: Array<T | null>;
  onReady(candidate: MorphCandidate, value: T): void;
};

export type CommitResult =
  | { committed: true }
  | { committed: false; error: unknown; preservesStagedLeases: boolean };

export type MorphSettlement = {
  resolve(): void;
  reject(error: unknown): void;
};

export type ConservativeLease = {
  lease: TextureLease;
  resources: VisibleResource[];
};

export class TextureBudgetEnforcementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextureBudgetEnforcementError";
  }
}

export function isBudgetAdmissionFailure(error: unknown): boolean {
  if (error instanceof RangeError) return true;
  return error instanceof AggregateError && error.errors.some((entry) => entry instanceof RangeError);
}

export function isRecoverablePinnedBudgetError(error: unknown): boolean {
  const isPinnedError = (entry: unknown) => (
    entry instanceof RangeError
    && entry.message === "Pinned textures exceed the new pool byte budget."
  );
  if (isPinnedError(error)) return true;
  return error instanceof AggregateError
    && error.errors.length > 0
    && error.errors.every(isPinnedError);
}

export function createDefaultIdleScheduler(): IdleScheduler {
  const host = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  return {
    request(callback) {
      return host.requestIdleCallback?.(callback) ?? globalThis.setTimeout(callback, 0);
    },
    cancel(id) {
      if (host.cancelIdleCallback) host.cancelIdleCallback(id);
      else globalThis.clearTimeout(id);
    },
  };
}
