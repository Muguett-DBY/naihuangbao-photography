export type ResponsiveImageAttrs = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

export function getResponsiveImageAttrs(src: string, sizes?: string): ResponsiveImageAttrs {
  if (!sizes) return { src };
  // Strip query string so variant URLs are clean
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop() || "";
  return {
    src,
    srcSet: `/images/gallery/640/${fileName} 640w, /images/gallery/960/${fileName} 960w, ${base} 1200w`,
    sizes,
  };
}
