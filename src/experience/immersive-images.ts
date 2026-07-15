import { isPublicPhotoImagePath } from "./texture-pool";

function currentBaseUrl(): URL {
  if (typeof document !== "undefined" && document.baseURI) return new URL(document.baseURI);
  if (typeof location !== "undefined" && location.href) return new URL(location.href);
  return new URL("http://localhost/");
}

export function selectImmersiveImageUrls(
  candidates: readonly unknown[],
  limit = 10,
): string[] {
  const baseUrl = currentBaseUrl();
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.min(10, Math.floor(limit))) : 10;
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= safeLimit) break;
    if (typeof candidate !== "string" || candidate.trim() === "") continue;

    let url: URL;
    try {
      url = new URL(candidate.trim(), baseUrl);
    } catch {
      continue;
    }

    const supported = (url.protocol === "http:" || url.protocol === "https:")
      && url.origin === baseUrl.origin
      && url.username === ""
      && url.password === ""
      && (/\.(?:avif|webp)$/i.test(url.pathname) || isPublicPhotoImagePath(url.pathname));
    if (!supported) continue;

    url.hash = "";
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    selected.push(`${url.pathname}${url.search}`);
  }

  return selected;
}
