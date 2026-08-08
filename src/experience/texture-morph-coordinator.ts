import { TexturePool, type TextureLease } from "./texture-pool";

import {
  isBudgetAdmissionFailure,
  isRecoverablePinnedBudgetError,
  TextureBudgetEnforcementError,
  type CommitResult,
  type ConservativeLease,
  type IdleScheduler,
  type IdleWork,
  type MorphCandidate,
  type MorphSettlement,
  type TextureMorphCoordinatorOptions,
  type VisibleResource,
} from "./texture-morph-support";

export class TextureMorphCoordinator<T> {
  private readonly pool: TexturePool<T>;
  private readonly idleScheduler: IdleScheduler;
  private readonly onCommit: TextureMorphCoordinatorOptions<T>["onCommit"];
  private readonly onUpdate: TextureMorphCoordinatorOptions<T>["onUpdate"];
  private readonly onError: (error: unknown) => void;
  private generation = 0;
  private idleTask: number | null = null;
  private idleWork: IdleWork<T> | null = null;
  private stagedLease: TextureLease | null = null;
  private backgroundLease: TextureLease | null = null;
  private visibleResources: VisibleResource[] = [];
  private conservativeLeases: ConservativeLease[] = [];
  private settleCurrent: MorphSettlement | null = null;
  private disposed = false;

  constructor(options: TextureMorphCoordinatorOptions<T>) {
    this.pool = options.pool;
    this.idleScheduler = options.idleScheduler;
    this.onCommit = options.onCommit;
    this.onUpdate = options.onUpdate;
    this.onError = options.onError ?? (() => undefined);
  }

  morph(imageUrls: string[], maxSlots: number): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const version = ++this.generation;
    this.finishCurrent();
    this.cancelIdle();
    this.idleWork = null;
    this.release(this.stagedLease);
    this.release(this.backgroundLease);
    this.stagedLease = null;
    this.backgroundLease = null;

    const requested = imageUrls.slice(0, Math.max(0, maxSlots));
    const slots: Array<T | null> = Array.from({ length: Math.max(1, requested.length) }, () => null);
    const candidates: MorphCandidate[] = [];
    requested.forEach((url, index) => {
      try {
        candidates.push({ index, url: this.pool.normalize(url) });
      } catch {
        // Unsupported route media is represented by an ink slot.
      }
    });

    if (candidates.length === 0) {
      const result = this.commitFallback(version, slots);
      return result.committed ? Promise.resolve() : Promise.reject(result.error);
    }

    const candidateUrls = candidates.map((candidate) => candidate.url);
    let stagedLease: TextureLease;
    try {
      stagedLease = this.pool.pin(candidateUrls);
      this.stagedLease = stagedLease;
      this.pool.retain([...this.visibleResources.map((resource) => resource.url), ...candidateUrls]);
    } catch (error) {
      this.release(this.stagedLease);
      this.stagedLease = null;
      this.report(error);
      const result = this.commitFallback(version, slots);
      return result.committed ? Promise.resolve() : Promise.reject(result.error);
    }

    return new Promise<void>((resolve, reject) => {
      this.settleCurrent = { resolve, reject };
      const critical = candidates.slice(0, 3);
      let completedCritical = 0;
      let committed = false;
      let budgetHandedOff = false;

      const rejectMorph = (error: unknown, releaseStagedLease: boolean) => {
        if (version !== this.generation) return;
        this.generation += 1;
        this.cancelIdle();
        this.idleWork = null;
        if (releaseStagedLease) this.releaseStagedLease(stagedLease);
        this.retain(this.visibleResources.map((resource) => resource.url));
        this.rejectCurrent(error);
      };

      const handoffForBudget = () => {
        if (budgetHandedOff || this.visibleResources.length === 0) return true;
        const inkSlots = slots.map(() => null);
        const result = this.commitFallback(version, inkSlots, candidateUrls, true);
        if (!result.committed) {
          rejectMorph(result.error, !result.preservesStagedLeases);
          return false;
        }
        budgetHandedOff = true;
        return true;
      };

      const commit = () => {
        if (committed || this.disposed || version !== this.generation) return;
        committed = true;
        const hasTexture = slots.some((slot) => slot !== null);
        const result = hasTexture
          ? this.commitSlots(version, slots, candidates, stagedLease)
          : this.commitFallback(version, slots);
        if (!result.committed) {
          rejectMorph(result.error, !result.preservesStagedLeases);
          return;
        }
        else if (!hasTexture) this.releaseStagedLease(stagedLease);
        this.finishCurrent();
      };

      const receiveTexture = (candidate: MorphCandidate, value: T) => {
        if (this.disposed || version !== this.generation) return;
        slots[candidate.index] = value;
        if (!committed) commit();
        else this.update(candidate, value);
      };

      this.beginIdleWork(version, candidates.slice(3), slots, receiveTexture);

      const visibleBytes = this.pool.bytesFor(this.visibleResources.map((resource) => resource.url));
      if (visibleBytes >= this.pool.maxBytes && !handoffForBudget()) {
        this.finishCurrent();
        return;
      }

      const acquireCritical = (candidate: MorphCandidate) => {
        let pending: Promise<T>;
        try {
          pending = this.pool.acquire(candidate.url);
        } catch {
          completedCritical += 1;
          if (completedCritical === critical.length) commit();
          return;
        }

        void pending.then(
          (value) => {
            receiveTexture(candidate, value);
          },
          (error: unknown) => {
            if (this.disposed || version !== this.generation) return;
            if (!budgetHandedOff && isBudgetAdmissionFailure(error) && handoffForBudget()) {
              acquireCritical(candidate);
              return;
            }
            completedCritical += 1;
            if (!committed && completedCritical === critical.length) commit();
          },
        );
      };

      for (const candidate of critical) acquireCritical(candidate);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.finishCurrent();
    this.cancelIdle();
    this.idleWork = null;
    this.release(this.stagedLease);
    this.release(this.backgroundLease);
    this.releaseMany(this.visibleResources.map((resource) => resource.lease));
    this.releaseConservativeLeases();
    this.stagedLease = null;
    this.backgroundLease = null;
    this.visibleResources = [];
    this.retain([]);
  }

  enforceBudget(maxBytes: number): void {
    if (this.disposed) return;
    this.cancelIdle();
    this.release(this.backgroundLease);
    this.backgroundLease = null;
    this.retain(this.visibleResources.map((resource) => resource.url));
    this.clearConservativeBudgetOwnership();
    this.setBudget(maxBytes, true);

    while (this.pool.totalBytes > maxBytes && this.visibleResources.length > 0) {
      const resource = this.visibleResources.at(-1);
      if (!resource) break;
      try {
        this.onUpdate(resource.index, null);
      } catch (error) {
        this.report(error);
        break;
      }
      this.visibleResources.pop();
      this.release(resource.lease);
      this.setBudget(maxBytes, true);
    }

    if (this.pool.totalBytes > maxBytes) {
      this.report(new RangeError("Unable to satisfy the texture budget after releasing visible slots."));
    }
    this.requestIdleWork();
  }

  releaseTransientTextures(): void {
    if (this.disposed) return;
    this.generation += 1;
    this.finishCurrent();
    this.cancelIdle();
    this.idleWork = null;

    const commit = this.callCommit([]);
    if (!commit.committed) {
      this.report(commit.error);
      return;
    }

    const stagedLease = this.stagedLease;
    const backgroundLease = this.backgroundLease;
    const visibleLeases = this.visibleResources.map((resource) => resource.lease);
    this.stagedLease = null;
    this.backgroundLease = null;
    this.visibleResources = [];
    this.release(stagedLease);
    this.release(backgroundLease);
    this.releaseMany(visibleLeases);
    this.releaseConservativeLeases();
    this.discardUnretained([]);
  }

  private commitFallback(
    version: number,
    slots: Array<T | null>,
    retainedUrls: string[] = [],
    discardUnretained = false,
  ): CommitResult {
    if (this.disposed || version !== this.generation) {
      return { committed: false, error: new Error("Texture morph is no longer active."), preservesStagedLeases: false };
    }
    const commit = this.callCommit(slots);
    if (!commit.committed) return commit;
    const oldVisibleResources = this.visibleResources;
    this.visibleResources = [];
    this.releaseMany(oldVisibleResources.map((resource) => resource.lease));
    this.releaseConservativeLeases();
    this.retain(retainedUrls);
    if (discardUnretained) this.discardUnretained(retainedUrls);
    return { committed: true };
  }

  private commitSlots(
    version: number,
    slots: Array<T | null>,
    candidates: MorphCandidate[],
    stagedLease: TextureLease,
  ): CommitResult {
    if (this.disposed || version !== this.generation) {
      return { committed: false, error: new Error("Texture morph is no longer active."), preservesStagedLeases: false };
    }
    const successful = candidates.filter((candidate) => slots[candidate.index] !== null);
    const successfulUrls = successful.map((candidate) => candidate.url);
    const nextVisibleResources: VisibleResource[] = [];
    if (successfulUrls.length > 0) {
      try {
        for (const candidate of successful) {
          nextVisibleResources.push({ ...candidate, lease: this.pool.pin([candidate.url]) });
        }
      } catch (error) {
        for (const candidate of successful) slots[candidate.index] = null;
        successfulUrls.length = 0;
        this.releaseMany(nextVisibleResources.map((resource) => resource.lease));
        nextVisibleResources.length = 0;
        this.report(error);
      }
    }

    const commit = this.callCommit(slots);
    if (!commit.committed) {
      this.preserveStagedLease(stagedLease, nextVisibleResources);
      this.preserveResourceLeases(nextVisibleResources);
      return { ...commit, preservesStagedLeases: true };
    }

    const oldVisibleResources = this.visibleResources;
    this.visibleResources = nextVisibleResources;
    this.backgroundLease = stagedLease;
    if (this.stagedLease === stagedLease) this.stagedLease = null;
    this.releaseMany(oldVisibleResources.map((resource) => resource.lease));
    this.releaseConservativeLeases();
    this.retain(candidates.map((candidate) => candidate.url));
    return { committed: true };
  }

  private beginIdleWork(
    version: number,
    candidates: MorphCandidate[],
    slots: Array<T | null>,
    onReady: IdleWork<T>["onReady"],
  ): void {
    if (candidates.length === 0) return;
    this.idleWork = { version, candidates: [...candidates], slots, onReady };
    this.requestIdleWork();
  }

  private requestIdleWork(): void {
    const work = this.idleWork;
    if (!work || this.idleTask !== null || this.disposed || work.version !== this.generation || work.candidates.length === 0) return;
    this.idleTask = this.idleScheduler.request(() => {
      this.idleTask = null;
      if (this.disposed || work !== this.idleWork || work.version !== this.generation) return;
      const candidate = work.candidates.shift();
      if (!candidate) return;
      try {
        void this.pool.acquire(candidate.url).then(
          (value) => {
            if (this.disposed || work !== this.idleWork || work.version !== this.generation) return;
            work.slots[candidate.index] = value;
            work.onReady(candidate, value);
          },
          () => undefined,
        );
      } catch {
        // Invalidated or disposed pools make the slot remain an ink frame.
      }
      this.requestIdleWork();
    });
  }

  private update(candidate: MorphCandidate, value: T | null): void {
    let lease: TextureLease;
    try {
      lease = this.pool.pin([candidate.url]);
    } catch (error) {
      this.report(error);
      return;
    }
    try {
      this.onUpdate(candidate.index, value);
    } catch (error) {
      this.report(error);
    }
    this.visibleResources.push({ ...candidate, lease });
  }

  private finishCurrent(): void {
    const settle = this.settleCurrent;
    this.settleCurrent = null;
    settle?.resolve();
  }

  private rejectCurrent(error: unknown): void {
    const settle = this.settleCurrent;
    this.settleCurrent = null;
    settle?.reject(error);
  }

  private cancelIdle(): void {
    if (this.idleTask === null) return;
    const task = this.idleTask;
    this.idleTask = null;
    try {
      this.idleScheduler.cancel(task);
    } catch (error) {
      this.report(error);
    }
  }

  private releaseStagedLease(lease: TextureLease): void {
    if (this.stagedLease === lease) this.stagedLease = null;
    this.release(lease);
  }

  private preserveStagedLease(lease: TextureLease, resources: VisibleResource[]): void {
    if (this.stagedLease === lease) this.stagedLease = null;
    this.conservativeLeases.push({ lease, resources: [...resources] });
  }

  private preserveResourceLeases(resources: VisibleResource[]): void {
    for (const resource of resources) this.conservativeLeases.push({ lease: resource.lease, resources: [resource] });
  }

  private releaseConservativeLeases(): void {
    const leases = this.conservativeLeases;
    this.conservativeLeases = [];
    this.releaseMany(leases.map((entry) => entry.lease));
  }

  private clearConservativeBudgetOwnership(): void {
    if (this.conservativeLeases.length === 0) return;
    const resources = new Map<number, VisibleResource>();
    for (const entry of this.conservativeLeases) {
      for (const resource of entry.resources) resources.set(resource.index, resource);
    }

    try {
      for (const resource of resources.values()) this.onUpdate(resource.index, null);
    } catch {
      throw new TextureBudgetEnforcementError("Unable to clear conservatively retained texture slots for the new byte budget.");
    }

    this.releaseConservativeLeases();
    this.discardUnretained(this.visibleResources.map((resource) => resource.url));
  }

  private callCommit(slots: ReadonlyArray<T | null>): CommitResult {
    try {
      this.onCommit(slots);
      return { committed: true };
    } catch (error) {
      return { committed: false, error, preservesStagedLeases: false };
    }
  }

  private release(lease: TextureLease | null): void {
    if (!lease) return;
    try {
      lease.release();
    } catch (error) {
      this.report(error);
    }
  }

  private releaseMany(leases: TextureLease[]): void {
    for (const lease of leases) this.release(lease);
  }

  private retain(urls: string[]): void {
    try {
      this.pool.retain(urls);
    } catch (error) {
      this.report(error);
    }
  }

  private discardUnretained(urls: string[]): void {
    try {
      this.pool.discardUnretained(urls);
    } catch (error) {
      this.report(error);
    }
  }

  private setBudget(maxBytes: number, suppressPinnedTransition = false): void {
    try {
      this.pool.setMaxBytes(maxBytes);
    } catch (error) {
      if (suppressPinnedTransition && isRecoverablePinnedBudgetError(error)) return;
      this.report(error);
    }
  }

  private report(error: unknown): void {
    try {
      this.onError(error);
    } catch {
      // Error reporting must not break ownership transitions.
    }
  }
}
