import { useEffect } from "react";
import type { ExperiencePauseReason } from "./experience-store";
import { useExperienceStore } from "./ExperienceProvider";

export function useExperiencePause(reason: ExperiencePauseReason, active: boolean): void {
  const store = useExperienceStore();

  useEffect(() => {
    store.setPaused(reason, active);
    return () => store.setPaused(reason, false);
  }, [active, reason, store]);
}
