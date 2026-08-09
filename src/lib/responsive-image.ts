export type ResponsiveImageAttrs = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

const responsiveImageDirectories = [
  "/images/gallery/",
  "/images/concept-premiere/",
  "/images/optical-archive/",
  "/images/visual-os-v5/",
  "/images/visual-os-v6/",
] as const;

const conceptPremiereSourceWidths: Readonly<Record<string, number>> = Object.freeze({
  "premiere-afterimage-v2.webp": 1200,
  "premiere-crossing-v3.webp": 1024,
  "premiere-duet-v4.webp": 1024,
  "premiere-film-v4.webp": 1122,
  "premiere-flora-v5.webp": 1672,
  "premiere-glass-v1.webp": 1024,
  "premiere-lens-v1.webp": 1024,
  "premiere-luminance-v4.webp": 1600,
  "premiere-mirror-v1.webp": 1024,
  "premiere-night-v5.webp": 1536,
  "premiere-opening-v1.webp": 1672,
  "premiere-prism-run-v4.webp": 1600,
  "premiere-prism-v2.webp": 1200,
  "premiere-reflection-v5.webp": 1122,
  "premiere-ribbon-v2.webp": 1200,
  "premiere-ritual-v3.webp": 1024,
  "premiere-run-v5.webp": 1672,
  "premiere-shards-v3.webp": 1672,
  "premiere-silk-v1.webp": 1024,
  "premiere-still-life-v1.webp": 1024,
  "premiere-surge-v4.webp": 1024,
  "premiere-veil-v5.webp": 1024,
  "premiere-wake-v3.webp": 1024,
  "rain-garden-lead-v6.webp": 1587,
  "rain-lane-night-v6.webp": 1586,
  "rain-window-portrait-v6.webp": 1122,
});

const opticalArchiveSourceWidths: Readonly<Record<string, number>> = Object.freeze({
  "archive-contact-sheet-v1.webp": 1448,
  "bamboo-shadow-ribbon-v1.webp": 1122,
  "booking-garden-table-v1.webp": 1672,
  "camellia-prism-macro-v1.webp": 1536,
  "color-glass-study-v1.webp": 1672,
  "course-light-study-v1.webp": 1672,
  "darkroom-light-table-v1.webp": 1122,
  "optical-garden-hero-v1.webp": 1672,
  "paper-ripple-study-v1.webp": 1536,
  "print-folio-v1.webp": 1672,
  "prism-lens-stilllife-v1.webp": 1536,
  "rain-moon-gate-night-v1.webp": 1672,
  "rain-window-corridor-v1.webp": 1672,
});

export function getResponsiveImageDirectory(src: string): string | null {
  const path = src.replace(/\?.*$/, "");
  return responsiveImageDirectories.find((directory) => path.startsWith(directory)) ?? null;
}

export function getResponsiveImageSourceWidth(src: string): number {
  const path = src.replace(/\?.*$/, "");
  const fileName = path.split("/").pop() || "";
  if (path.startsWith("/images/concept-premiere/")) return conceptPremiereSourceWidths[fileName] ?? 1200;
  if (path.startsWith("/images/optical-archive/")) return opticalArchiveSourceWidths[fileName] ?? 1200;
  if (path.startsWith("/images/visual-os-v5/")) return 1536;
  if (path.startsWith("/images/visual-os-v6/")) {
    return ["05-paper-rain-macro.webp", "06-archive-drawers.webp", "07-night-glass-garden.webp"].includes(fileName)
      ? 1122
      : 1672;
  }
  return 1200;
}

export function getResponsiveImageAttrs(src: string, sizes?: string): ResponsiveImageAttrs {
  if (!sizes) return { src };
  const directory = getResponsiveImageDirectory(src);
  if (!directory) return { src };

  // Strip query string so variant URLs are clean
  const base = src.replace(/\?.*$/, "");
  const version = src.includes("?") ? src.slice(src.indexOf("?")) : "";
  const fileName = base.split("/").pop() || "";
  const sourceWidth = getResponsiveImageSourceWidth(src);
  return {
    src,
    srcSet: `${directory}640/${fileName}${version} 640w, ${directory}960/${fileName}${version} 960w, ${base}${version} ${sourceWidth}w`,
    sizes,
  };
}
