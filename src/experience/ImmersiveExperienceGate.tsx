import { useEffect, useState, type ComponentType } from "react";
import { scheduleIdleTask } from "../lib/idle";
import { readCapabilitySignals, selectExperienceTier, type ExperienceTier } from "./capability-tier";
import { createDeferredExperienceLoad } from "./experience-controller";

type RenderedTier = Exclude<ExperienceTier, "static">;
type ExperienceComponent = ComponentType<{ tier: RenderedTier }>;

function subscribeToFirstInput(callback: () => void): () => void {
  const onInput = () => callback();
  window.addEventListener("pointerdown", onInput, { passive: true });
  window.addEventListener("focusin", onInput, true);
  window.addEventListener("scroll", onInput, { passive: true });
  return () => {
    window.removeEventListener("pointerdown", onInput);
    window.removeEventListener("focusin", onInput, true);
    window.removeEventListener("scroll", onInput);
  };
}

export function ImmersiveExperienceGate() {
  const [Experience, setExperience] = useState<ExperienceComponent | null>(null);
  const [tier, setTier] = useState<RenderedTier | null>(null);

  useEffect(() => {
    const resolvedTier = selectExperienceTier(readCapabilitySignals());
    document.documentElement.dataset.experienceTier = resolvedTier;
    if (resolvedTier === "static") return;

    let active = true;
    const disposeDeferredLoad = createDeferredExperienceLoad({
      load: () => {
        void import("./ImmersiveExperience").then(({ ImmersiveExperience }) => {
          if (!active) return;
          setTier(resolvedTier);
          setExperience(() => ImmersiveExperience);
        }).catch(() => undefined);
      },
      scheduleIdle: (callback) => scheduleIdleTask(callback, 360),
      scheduleDeadline: (callback, delayMs) => {
        const timeout = window.setTimeout(callback, delayMs);
        return () => window.clearTimeout(timeout);
      },
      subscribeImmediateTrigger: subscribeToFirstInput,
    });

    return () => {
      active = false;
      disposeDeferredLoad();
      delete document.documentElement.dataset.experienceTier;
    };
  }, []);

  return Experience && tier ? <Experience tier={tier} /> : null;
}
