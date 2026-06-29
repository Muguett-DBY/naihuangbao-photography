/**
 * Standalone utility functions for the photo editor.
 * Extracted from PhotoEditorPage to reduce file size.
 */

const MODEL_URL = "/models";
export const FACE_MODEL_LOAD_TIMEOUT_MS = 20_000;

export type FaceModelLoadFailureReason = "failed" | "timeout";
export type FaceModelLoadResult =
  | { ok: true; reason: null }
  | { ok: false; reason: FaceModelLoadFailureReason };

export class FaceModelLoadTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Face model loading timed out after ${timeoutMs}ms`);
    this.name = "FaceModelLoadTimeoutError";
  }
}

export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = FACE_MODEL_LOAD_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new FaceModelLoadTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Prepare face-api.js backend for CPU inference.
 * Some older face-api bundles do not expose a switchable CPU backend.
 */
export async function prepareFaceApiBackend(api: any) {
  try {
    await api.tf?.setBackend?.("cpu");
    await api.tf?.ready?.();
  } catch {
    // silently fail - backend may not be switchable
  }
}

/**
 * Load face-api.js models with progress tracking.
 */
export async function loadFaceApiModels(
  onProgress?: (progress: number) => void,
): Promise<FaceModelLoadResult> {
  try {
    await withTimeout((async () => {
      const faceapi = await import("face-api.js");
      await prepareFaceApiBackend(faceapi);

      const models = [
        { name: "Tiny Face Detector", load: () => faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL) },
        { name: "Face Landmark 68", load: () => faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL) },
      ];

      for (let i = 0; i < models.length; i++) {
        await models[i].load();
        onProgress?.(((i + 1) / models.length) * 100);
      }
    })());

    return { ok: true, reason: null };
  } catch (e) {
    console.error("Failed to load face-api models:", e);
    return {
      ok: false,
      reason: e instanceof FaceModelLoadTimeoutError ? "timeout" : "failed",
    };
  }
}
