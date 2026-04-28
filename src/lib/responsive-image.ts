const responsiveWidths = [640, 960] as const;
const staticGalleryPattern = /^\/images\/gallery\/([^/?#]+)(\?[^#]*)?$/;

export type ResponsiveImageAttrs = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

export function getResponsiveImageAttrs(src: string, sizes?: string): ResponsiveImageAttrs {
  const match = src.match(staticGalleryPattern);
  if (!match || !sizes) {
    return { src };
  }

  const [, fileName, version = ""] = match;
  const variants = responsiveWidths.map(
    (width) => `/images/gallery/${width}/${fileName}${version} ${width}w`,
  );

  return {
    src,
    srcSet: [...variants, `/images/gallery/${fileName}${version} 1200w`].join(", "),
    sizes,
  };
}
