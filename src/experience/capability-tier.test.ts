import { describe, expect, it } from "vitest";
import { selectExperienceTier } from "./capability-tier";

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
});
