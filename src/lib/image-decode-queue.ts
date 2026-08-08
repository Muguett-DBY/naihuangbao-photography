const navigatorWithMemory = typeof navigator === "undefined"
  ? undefined
  : navigator as Navigator & { deviceMemory?: number };
const decodeConcurrency = navigatorWithMemory?.deviceMemory && navigatorWithMemory.deviceMemory <= 4 ? 2 : 3;

type QueueJob = () => Promise<void>;

export class BoundedTaskQueue {
  private active = 0;
  private readonly pending: QueueJob[] = [];

  constructor(readonly concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Queue concurrency must be a positive integer");
  }

  enqueue<T>(task: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      this.pending.push(async () => {
        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        }
      });
      this.drain();
    });
  }

  private drain() {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift();
      if (!job) return;
      this.active += 1;
      void job().finally(() => {
        this.active -= 1;
        this.drain();
      });
    }
  }
}

const imageDecodeQueue = new BoundedTaskQueue(decodeConcurrency);
const decodedImages = new Map<string, Promise<HTMLImageElement>>();
const MAX_DECODED_IMAGES = 24;

export function loadDecodedImage(src: string) {
  const cached = decodedImages.get(src);
  if (cached) return cached;

  if (decodedImages.size >= MAX_DECODED_IMAGES) {
    decodedImages.delete(decodedImages.keys().next().value as string);
  }

  const request = imageDecodeQueue.enqueue(() => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const decode = typeof image.decode === "function" ? image.decode() : Promise.resolve();
      void decode.catch(() => undefined).then(() => resolve(image));
    };
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  }));
  decodedImages.set(src, request);
  void request.catch(() => decodedImages.delete(src));
  return request;
}

export function clearDecodedImageCache() {
  decodedImages.clear();
}
