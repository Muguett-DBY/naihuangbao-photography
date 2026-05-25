/**
 * Generates responsive `<picture>` element attributes for gallery images.
 * Uses WebP sources, falls back to original format.
 * No AVIF — project has no .avif assets.
 */

export function getResponsivePictureAttrs(src: string, sizes?: string): {
  sources: Array<{ type: string; srcSet: string; sizes?: string }>;
  fallback: { src: string; srcSet?: string; sizes?: string };
} {
  if (!sizes || !src.startsWith("/images/gallery/")) {
    return {
      sources: [],
      fallback: { src },
    };
  }

  const base = src.replace(/\?.*$/, "");
  const version = src.includes("?") ? src.slice(src.indexOf("?")) : "";
  const fileName = base.split("/").pop() || "";

  const webpSrcSet = [
    `/images/gallery/640/${fileName}${version} 640w`,
    `/images/gallery/960/${fileName}${version} 960w`,
    `${base}${version} 1200w`,
  ].join(", ");

  return {
    sources: [
      { type: "image/webp", srcSet: webpSrcSet, sizes },
    ],
    fallback: { src, srcSet: webpSrcSet, sizes },
  };
}
