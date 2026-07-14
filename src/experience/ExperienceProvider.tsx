import { createContext, useContext, useRef, type ReactNode } from "react";
import { ExperienceRuntimeBridge } from "./experience-controller";
import { createExperienceStore, type ExperienceStore } from "./experience-store";

type ExperienceContextValue = {
  store: ExperienceStore;
  runtimeBridge: ExperienceRuntimeBridge;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const valueRef = useRef<ExperienceContextValue | null>(null);
  if (valueRef.current === null) {
    valueRef.current = {
      store: createExperienceStore(),
      runtimeBridge: new ExperienceRuntimeBridge(),
    };
  }

  return <ExperienceContext.Provider value={valueRef.current}>{children}</ExperienceContext.Provider>;
}

export function useExperienceStore(): ExperienceStore {
  const value = useContext(ExperienceContext);
  if (value === null) throw new Error("useExperienceStore must be used within an ExperienceProvider.");
  return value.store;
}

export function useExperienceRuntimeBridge(): ExperienceRuntimeBridge {
  const value = useContext(ExperienceContext);
  if (value === null) throw new Error("useExperienceRuntimeBridge must be used within an ExperienceProvider.");
  return value.runtimeBridge;
}
