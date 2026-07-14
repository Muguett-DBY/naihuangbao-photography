import { useEffect, useState, type ComponentType } from "react";
import { readCapabilitySignals, selectExperienceTier } from "./capability-tier";

export function ImmersiveExperienceGate() {
  const [Experience, setExperience] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (selectExperienceTier(readCapabilitySignals()) === "static") return;

    let active = true;
    void import("./ImmersiveExperience").then(({ ImmersiveExperience }) => {
      if (active) setExperience(() => ImmersiveExperience);
    });

    return () => {
      active = false;
    };
  }, []);

  return Experience ? <Experience /> : null;
}
