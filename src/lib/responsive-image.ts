export type ResponsiveImageAttrs = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

export function getResponsiveImageAttrs(src: string, sizes?: string): ResponsiveImageAttrs {
  if (!sizes) return { src };
  if (!src.startsWith("/images/gallery/")) return { src };

  // Strip query string so variant URLs are clean
  const base = src.replace(/\?.*$/, "");
  const version = src.includes("?") ? src.slice(src.indexOf("?")) : "";
  const fileName = base.split("/").pop() || "";
  return {
    src,
    srcSet: `/images/gallery/640/${fileName}${version} 640w, /images/gallery/960/${fileName}${version} 960w, ${base}${version} 1200w`,
    sizes,
  };
}
