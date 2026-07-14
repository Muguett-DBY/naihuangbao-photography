import { afterEach, describe, expect, it, vi } from "vitest";
import { readCapabilitySignals, selectExperienceTier } from "./capability-tier";

const capable = {
  reducedMotion: false,
  saveData: false,
  webglAvailable: true,
  gpuDisabled: false,
  coarsePointer: false,
  viewportWidth: 1440,
  hardwareConcurrency: 12,
  deviceMemory: 8,
};

describe("selectExperienceTier", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["reduced motion", { reducedMotion: true }],
    ["data saver", { saveData: true }],
    ["WebGL failure", { webglAvailable: false }],
    ["test GPU policy", { gpuDisabled: true }],
  ])("selects static for %s", (_label, override) => {
    expect(selectExperienceTier({ ...capable, ...override })).toBe("static");
  });

  it("selects medium for mobile or constrained hardware", () => {
    expect(selectExperienceTier({ ...capable, viewportWidth: 430, coarsePointer: true })).toBe("medium");
    expect(selectExperienceTier({ ...capable, hardwareConcurrency: 4, deviceMemory: 4 })).toBe("medium");
  });

  it("selects high only for a capable desktop", () => {
    expect(selectExperienceTier(capable)).toBe("high");
  });

  it("fails closed when the WebGL probe throws", () => {
    const getContext = vi.fn(() => {
      throw new Error("WebGL blocked");
    });
    const remove = vi.fn();

    vi.stubGlobal("window", {
      innerWidth: capable.viewportWidth,
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal("navigator", {
      connection: { saveData: false },
      hardwareConcurrency: capable.hardwareConcurrency,
      deviceMemory: capable.deviceMemory,
    });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ getContext, remove })),
    });
    vi.stubGlobal("sessionStorage", { getItem: vi.fn(() => null) });

    expect(readCapabilitySignals().webglAvailable).toBe(false);
    expect(getContext).toHaveBeenCalledWith("webgl2");
    expect(remove).toHaveBeenCalledOnce();
  });
});
