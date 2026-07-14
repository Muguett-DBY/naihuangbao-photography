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

export class TexturePool<T> {
  private readonly entries = new Map<string, TextureEntry<T>>();
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
          this.disposeValue(result.value);
          throw abortError();
        }
        entry.value = result.value;
        entry.bytes = Math.max(0, result.bytes);
        this.bytes += entry.bytes;
        if (entry.bytes > this.byteLimit) {
          this.entries.delete(key);
          this.bytes -= entry.bytes;
          this.disposeValue(result.value);
          entry.value = undefined;
          throw new RangeError("Texture exceeds the pool byte budget.");
        }
        this.evictToBudget(key);
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

  retain(urls: Iterable<string>): void {
    if (this.disposed) return;
    const retained = new Set(Array.from(urls, (url) => this.normalize(url)));

    for (const [key, entry] of this.entries) {
      if (retained.has(key) || entry.value !== undefined) continue;
      this.entries.delete(key);
      entry.controller.abort();
    }

    this.evictToBudget();
  }

  setMaxBytes(maxBytes: number): void {
    this.byteLimit = Math.max(0, maxBytes);
    this.evictToBudget();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const entries = [...this.entries.values()];
    this.entries.clear();
    this.bytes = 0;

    for (const entry of entries) {
      if (entry.value === undefined) entry.controller.abort();
      else this.disposeValue(entry.value);
    }
  }

  private normalize(url: string): string {
    const normalized = new URL(url, this.baseUrl);
    if (normalized.origin !== this.baseUrl.origin) {
      throw new TypeError("Texture URLs must be same-origin.");
    }
    normalized.hash = "";
    return normalized.href;
  }

  private evictToBudget(preservedKey?: string): void {
    if (this.bytes <= this.byteLimit) return;
    const fulfilled = [...this.entries.entries()]
      .filter((entry): entry is [string, TextureEntry<T> & { value: T }] => (
        entry[0] !== preservedKey && entry[1].value !== undefined
      ))
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed);

    for (const [key, entry] of fulfilled) {
      if (this.bytes <= this.byteLimit) break;
      if (!this.entries.delete(key)) continue;
      this.bytes -= entry.bytes;
      this.disposeValue(entry.value);
    }
  }
}
