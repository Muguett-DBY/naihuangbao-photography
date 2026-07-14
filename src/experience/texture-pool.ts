export type TextureLoadResult<T> = {
  value: T;
  width: number;
  height: number;
  bytes: number;
};

export type TexturePoolOptions<T> = {
  maxBytes: number;
  load(url: string, signal: AbortSignal): Promise<TextureLoadResult<T>>;
  dispose(value: T): void;
  baseUrl?: string;
};

export type TextureLease = {
  release(): void;
};

type TextureEntry<T> = {
  promise: Promise<T>;
  value?: T;
  bytes: number;
  lastUsed: number;
  controller: AbortController;
};

function defaultBaseUrl(): string {
  if (typeof document !== "undefined" && document.baseURI) return document.baseURI;
  if (typeof location !== "undefined" && location.href) return location.href;
  return "http://localhost/";
}

function abortError(): DOMException {
  return new DOMException("Texture load was aborted.", "AbortError");
}

function aggregate(errors: unknown[], message: string): AggregateError | null {
  return errors.length > 0 ? new AggregateError(errors, message) : null;
}

export class TexturePool<T> {
  private readonly entries = new Map<string, TextureEntry<T>>();
  private readonly pinCounts = new Map<string, number>();
  private readonly load: TexturePoolOptions<T>["load"];
  private readonly disposeValue: TexturePoolOptions<T>["dispose"];
  private readonly baseUrl: URL;
  private usageClock = 0;
  private byteLimit: number;
  private bytes = 0;
  private disposed = false;

  constructor(options: TexturePoolOptions<T>) {
    this.byteLimit = Math.max(0, options.maxBytes);
    this.load = options.load;
    this.disposeValue = options.dispose;
    this.baseUrl = new URL(options.baseUrl ?? defaultBaseUrl());
  }

  get totalBytes(): number {
    return this.bytes;
  }

  get maxBytes(): number {
    return this.byteLimit;
  }

  normalize(url: string): string {
    let normalized: URL;
    try {
      normalized = new URL(url, this.baseUrl);
    } catch (error) {
      throw new TypeError(`Invalid texture URL: ${String(error)}`);
    }

    const supportedProtocol = normalized.protocol === "http:" || normalized.protocol === "https:";
    const supportedExtension = /\.(?:avif|webp)$/i.test(normalized.pathname);
    if (
      !supportedProtocol
      || normalized.origin !== this.baseUrl.origin
      || normalized.username !== ""
      || normalized.password !== ""
      || !supportedExtension
    ) {
      throw new TypeError("Texture URLs must be same-origin AVIF or WebP resources.");
    }

    normalized.hash = "";
    return normalized.href;
  }

  acquire(url: string): Promise<T> {
    if (this.disposed) throw new Error("Cannot acquire a texture from a disposed pool.");
    const key = this.normalize(url);
    const existing = this.entries.get(key);
    if (existing) {
      existing.lastUsed = ++this.usageClock;
      return existing.promise;
    }

    const controller = new AbortController();
    let entry: TextureEntry<T>;
    const promise = this.load(key, controller.signal).then(
      (result) => {
        if (this.disposed || controller.signal.aborted || this.entries.get(key) !== entry) {
          const errors: unknown[] = [];
          this.tryDispose(result.value, errors);
          const disposalError = aggregate(errors, "Failed to dispose a stale texture completion.");
          if (disposalError) throw disposalError;
          throw abortError();
        }

        entry.value = result.value;
        entry.bytes = Math.max(0, result.bytes);
        this.bytes += entry.bytes;
        const errors: unknown[] = [];

        if (entry.bytes > this.byteLimit) {
          this.removeFulfilledEntry(key, entry, errors);
          const oversized = new RangeError("Texture exceeds the pool byte budget.");
          const disposalError = aggregate([oversized, ...errors], "Texture admission failed.");
          throw disposalError ?? oversized;
        }

        errors.push(...this.evictToBudget(key));
        if (this.bytes > this.byteLimit || errors.length > 0) {
          const budgetError = this.bytes > this.byteLimit
            ? new RangeError("Pinned textures leave insufficient byte budget for admission.")
            : null;
          this.removeFulfilledEntry(key, entry, errors);
          if (budgetError && errors.length === 0) throw budgetError;
          const admissionErrors = budgetError ? [budgetError, ...errors] : errors;
          throw new AggregateError(admissionErrors, "Texture admission cleanup failed.");
        }

        return result.value;
      },
      (error: unknown) => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
        if (controller.signal.aborted) throw abortError();
        throw error;
      },
    );

    entry = {
      promise,
      bytes: 0,
      lastUsed: ++this.usageClock,
      controller,
    };
    this.entries.set(key, entry);
    return promise;
  }

  pin(urls: Iterable<string>): TextureLease {
    if (this.disposed) throw new Error("Cannot pin textures in a disposed pool.");
    const keys = new Set(Array.from(urls, (url) => this.normalize(url)));
    for (const key of keys) this.pinCounts.set(key, (this.pinCounts.get(key) ?? 0) + 1);
    let released = false;

    return {
      release: () => {
        if (released) return;
        released = true;
        for (const key of keys) {
          const count = this.pinCounts.get(key) ?? 0;
          if (count <= 1) this.pinCounts.delete(key);
          else this.pinCounts.set(key, count - 1);
        }
        const error = aggregate(this.evictToBudget(), "Failed to evict textures after releasing a lease.");
        if (error) throw error;
      },
    };
  }

  retain(urls: Iterable<string>): void {
    if (this.disposed) return;
    const retained = new Set(Array.from(urls, (url) => this.normalize(url)));

    for (const [key, entry] of this.entries) {
      if (retained.has(key) || this.isPinned(key) || entry.value !== undefined) continue;
      this.entries.delete(key);
      entry.controller.abort();
    }

    const error = aggregate(this.evictToBudget(), "Failed to evict textures while retaining a route set.");
    if (error) throw error;
  }

  setMaxBytes(maxBytes: number): void {
    this.byteLimit = Math.max(0, maxBytes);
    const errors = this.evictToBudget();
    if (this.bytes > this.byteLimit) {
      const blocked = new RangeError("Pinned textures exceed the new pool byte budget.");
      if (errors.length === 0) throw blocked;
      errors.unshift(blocked);
    }
    const error = aggregate(errors, "Failed to evict textures for a new byte budget.");
    if (error) throw error;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const entries = [...this.entries.values()];
    this.entries.clear();
    this.pinCounts.clear();
    this.bytes = 0;
    const errors: unknown[] = [];

    for (const entry of entries) {
      if (entry.value === undefined) entry.controller.abort();
      else this.tryDispose(entry.value, errors);
    }

    const error = aggregate(errors, "Failed to dispose one or more cached textures.");
    if (error) throw error;
  }

  private isPinned(key: string): boolean {
    return (this.pinCounts.get(key) ?? 0) > 0;
  }

  private tryDispose(value: T, errors: unknown[]): void {
    try {
      this.disposeValue(value);
    } catch (error) {
      errors.push(error);
    }
  }

  private removeFulfilledEntry(key: string, entry: TextureEntry<T>, errors: unknown[]): void {
    if (this.entries.get(key) === entry) this.entries.delete(key);
    if (entry.value === undefined) return;
    this.bytes -= entry.bytes;
    const value = entry.value;
    entry.value = undefined;
    entry.bytes = 0;
    this.tryDispose(value, errors);
  }

  private evictToBudget(preservedKey?: string): unknown[] {
    const errors: unknown[] = [];
    if (this.bytes <= this.byteLimit) return errors;
    const fulfilled = [...this.entries.entries()]
      .filter((candidate): candidate is [string, TextureEntry<T> & { value: T }] => (
        candidate[0] !== preservedKey
        && !this.isPinned(candidate[0])
        && candidate[1].value !== undefined
      ))
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed);

    for (const [key, entry] of fulfilled) {
      if (this.bytes <= this.byteLimit) break;
      this.removeFulfilledEntry(key, entry, errors);
    }
    return errors;
  }
}
