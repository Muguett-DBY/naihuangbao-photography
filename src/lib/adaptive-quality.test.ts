import { describe, expect, it } from "vitest";
import { experienceTierFromDataset, selectAdaptiveQuality } from "./adaptive-quality";

describe("adaptive quality governor", () => {
  const base = { tier: "high" as const, reducedMotion: false, saveData: false, hidden: false, longTaskCount: 0 };

  it("keeps capable visible sessions at full quality", () => {
    expect(selectAdaptiveQuality(base)).toBe("full");
  });

  it("moves to balanced quality under medium tier or repeated long tasks", () => {
    expect(selectAdaptiveQuality({ ...base, tier: "medium" })).toBe("balanced");
    expect(selectAdaptiveQuality({ ...base, longTaskCount: 3 })).toBe("balanced");
  });

  it("uses economy quality for explicit user and lifecycle constraints", () => {
    expect(selectAdaptiveQuality({ ...base, reducedMotion: true })).toBe("economy");
    expect(selectAdaptiveQuality({ ...base, saveData: true })).toBe("economy");
    expect(selectAdaptiveQuality({ ...base, hidden: true })).toBe("economy");
    expect(selectAdaptiveQuality({ ...base, longTaskCount: 8 })).toBe("economy");
  });

  it("treats unknown dataset values as medium rather than overcommitting", () => {
    expect(experienceTierFromDataset("high")).toBe("high");
    expect(experienceTierFromDataset("unexpected")).toBe("medium");
  });
});
