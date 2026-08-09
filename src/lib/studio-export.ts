export type StudioExportResult = {
  blob: Blob;
  backend: "worker" | "main-thread";
};

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`Canvas cannot export ${mime}`)), mime, quality);
  });
}

export function supportsWorkerCanvasExport() {
  return typeof Worker !== "undefined"
    && typeof OffscreenCanvas !== "undefined"
    && typeof createImageBitmap !== "undefined";
}

export async function exportStudioCanvas(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<StudioExportResult> {
  if (!supportsWorkerCanvasExport()) {
    return { blob: await canvasToBlob(canvas, mime, quality), backend: "main-thread" };
  }

  const bitmap = await createImageBitmap(canvas);
  const worker = new Worker(new URL("../workers/studio-export.worker.ts", import.meta.url), { type: "module" });
  return new Promise<StudioExportResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<{ blob: Blob }>) => {
      worker.terminate();
      resolve({ blob: event.data.blob, backend: "worker" });
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage({ bitmap, width: canvas.width, height: canvas.height, mime, quality }, [bitmap]);
  }).catch(async () => ({ blob: await canvasToBlob(canvas, mime, quality), backend: "main-thread" }));
}
