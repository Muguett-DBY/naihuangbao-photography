import { createContext, useContext } from "react";
import type { FaqItem, PackageItem, ServicePolicy, SiteContent, WhyCard } from "../../types/content";
import type { PhotoItem } from "../../types/photo";

export interface AdminContextValue {
  content: SiteContent;
  setContent: React.Dispatch<React.SetStateAction<SiteContent>>;
  remotePhotos: PhotoItem[];
  savingContent: string | null;
  showToast: (text: string, type: "success" | "error" | "info") => void;
  saveContentSections: (label: string, keys: (keyof SiteContent)[]) => Promise<void>;
  updateContent: <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => void;
  updatePackage: (index: number, patch: Partial<PackageItem>) => void;
  updatePolicy: (index: number, patch: Partial<ServicePolicy>) => void;
  updateFaq: (index: number, patch: Partial<FaqItem>) => void;
  updateWhyCard: (index: number, patch: Partial<WhyCard>) => void;
  emptyPackage: PackageItem;
  emptyPolicy: ServicePolicy;
  emptyFaq: FaqItem;
  emptyWhyCard: WhyCard;
}

export const AdminCtx = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error("useAdmin must be used inside AdminCtx.Provider");
  return ctx;
}
