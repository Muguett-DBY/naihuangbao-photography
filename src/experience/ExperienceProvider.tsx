import { createContext, useContext, useRef, type ReactNode } from "react";
import { createExperienceStore, type ExperienceStore } from "./experience-store";

const ExperienceContext = createContext<ExperienceStore | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ExperienceStore | null>(null);
  if (storeRef.current === null) storeRef.current = createExperienceStore();

  return <ExperienceContext.Provider value={storeRef.current}>{children}</ExperienceContext.Provider>;
}

export function useExperienceStore(): ExperienceStore {
  const store = useContext(ExperienceContext);
  if (store === null) throw new Error("useExperienceStore must be used within an ExperienceProvider.");
  return store;
}
