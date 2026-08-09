import type { ExperienceTier } from "../experience/capability-tier";

export type AdaptiveQuality = "full" | "balanced" | "economy";
export const RUNTIME_QUALITY_EVENT = "nhb:runtime-quality";

export type AdaptiveQualitySignals = {
  tier: ExperienceTier;
  reducedMotion: boolean;
  saveData: boolean;
  hidden: boolean;
  longTaskCount: number;
};

export function selectAdaptiveQuality(signals: AdaptiveQualitySignals): AdaptiveQuality {
  if (signals.reducedMotion || signals.saveData || signals.hidden || signals.tier === "static" || signals.longTaskCount >= 8) return "economy";
  if (signals.tier === "medium" || signals.longTaskCount >= 3) return "balanced";
  return "full";
}

export function experienceTierFromDataset(value: string | undefined): ExperienceTier {
  return value === "high" || value === "medium" || value === "static" ? value : "medium";
}
