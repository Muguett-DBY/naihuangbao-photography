export type ResponsiveImageAttrs = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

const responsiveImageDirectories = ["/images/gallery/", "/images/concept-premiere/"] as const;

export function getResponsiveImageDirectory(src: string): string | null {
  const path = src.replace(/\?.*$/, "");
  return responsiveImageDirectories.find((directory) => path.startsWith(directory)) ?? null;
}

export function getResponsiveImageAttrs(src: string, sizes?: string): ResponsiveImageAttrs {
  if (!sizes) return { src };
  const directory = getResponsiveImageDirectory(src);
  if (!directory) return { src };

  // Strip query string so variant URLs are clean
  const base = src.replace(/\?.*$/, "");
  const version = src.includes("?") ? src.slice(src.indexOf("?")) : "";
  const fileName = base.split("/").pop() || "";
  return {
    src,
    srcSet: `${directory}640/${fileName}${version} 640w, ${directory}960/${fileName}${version} 960w, ${base}${version} 1200w`,
    sizes,
  };
}
