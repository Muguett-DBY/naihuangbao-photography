import { useEffect, useState, type ComponentType } from "react";
import { scheduleIdleTask } from "../lib/idle";
import { readCapabilitySignals, selectExperienceTier, type ExperienceTier } from "./capability-tier";

type RenderedTier = Exclude<ExperienceTier, "static">;
type ExperienceComponent = ComponentType<{ tier: RenderedTier }>;

export function ImmersiveExperienceGate() {
  const [Experience, setExperience] = useState<ExperienceComponent | null>(null);
  const [tier, setTier] = useState<RenderedTier | null>(null);

  useEffect(() => {
    const resolvedTier = selectExperienceTier(readCapabilitySignals());
    if (resolvedTier === "static") return;

    let active = true;
    let started = false;
    let cancelIdleTask: () => void = () => undefined;
    const cleanupTriggers = () => {
      window.removeEventListener("pointerdown", load);
      window.removeEventListener("focusin", load, true);
      window.removeEventListener("scroll", load);
    };
    const load = () => {
      if (!active || started) return;
      started = true;
      cancelIdleTask();
      cleanupTriggers();

      void import("./ImmersiveExperience").then(({ ImmersiveExperience }) => {
        if (!active) return;
        setTier(resolvedTier);
        setExperience(() => ImmersiveExperience);
      }).catch(() => undefined);
    };

    cancelIdleTask = scheduleIdleTask(load, 120);
    window.addEventListener("pointerdown", load, { passive: true, once: true });
    window.addEventListener("focusin", load, { capture: true, once: true });
    window.addEventListener("scroll", load, { passive: true, once: true });

    return () => {
      active = false;
      cancelIdleTask();
      cleanupTriggers();
    };
  }, []);

  return Experience && tier ? <Experience tier={tier} /> : null;
}
