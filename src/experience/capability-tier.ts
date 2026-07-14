export type ExperienceTier = "static" | "medium" | "high";

export type CapabilitySignals = {
  reducedMotion: boolean;
  saveData: boolean;
  webglAvailable: boolean;
  gpuDisabled: boolean;
  coarsePointer: boolean;
  viewportWidth: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

type NavigatorCapabilities = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export function selectExperienceTier(signals: CapabilitySignals): ExperienceTier {
  if (signals.reducedMotion || signals.saveData || !signals.webglAvailable || signals.gpuDisabled) {
    return "static";
  }
  const constrainedCpu = (signals.hardwareConcurrency ?? 8) <= 4;
  const constrainedMemory = (signals.deviceMemory ?? 8) <= 4;
  if (signals.coarsePointer || signals.viewportWidth < 900 || constrainedCpu || constrainedMemory) {
    return "medium";
  }
  return "high";
}

function isWebglAvailable() {
  const canvas = document.createElement("canvas");
  try {
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } finally {
    canvas.remove();
  }
}

function isWebglDisabled() {
  try {
    return sessionStorage.getItem("nhb-disable-webgl") === "true";
  } catch {
    return false;
  }
}

export function readCapabilitySignals(): CapabilitySignals {
  const navigatorCapabilities = navigator as NavigatorCapabilities;

  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: navigatorCapabilities.connection?.saveData ?? false,
    webglAvailable: isWebglAvailable(),
    gpuDisabled: isWebglDisabled(),
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigatorCapabilities.deviceMemory,
  };
}
