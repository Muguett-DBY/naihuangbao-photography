import { defaultSiteContent, mergeSiteContent } from "../data/content";
import type { SiteContent } from "../types/content";
import type { PhotoItem } from "../types/photo";

export async function fetchAdminPhotos(signal?: AbortSignal) {
  const response = await fetch("/api/admin/photos", { credentials: "include", signal });
  if (!response.ok) return [];
  const data = (await response.json()) as { photos?: PhotoItem[] };
  return data.photos ?? [];
}

export async function fetchAdminContent(signal?: AbortSignal) {
  const response = await fetch("/api/admin/content", { credentials: "include", signal });
  if (!response.ok) return { content: defaultSiteContent, storageReady: true };
  const data = (await response.json()) as { content?: Partial<SiteContent>; storageReady?: boolean };
  return {
    content: mergeSiteContent(data.content),
    storageReady: data.storageReady !== false,
  };
}
