/**
 * Standalone utility functions for the photo editor.
 * Extracted from PhotoEditorPage to reduce file size.
 */

const MODEL_URL = "/models";

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
): Promise<boolean> {
  try {
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

    return true;
  } catch (e) {
    console.error("Failed to load face-api models:", e);
    return false;
  }
}
