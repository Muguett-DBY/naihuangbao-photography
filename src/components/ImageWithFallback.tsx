import { useState } from "react";
import { getResponsiveImageAttrs } from "../lib/responsive-image";
import { FilmPlaceholder } from "./FilmPlaceholder";

export function ImageWithFallback({
  src,
  alt,
  title,
  tone = "rose",
  className,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  title: string;
  tone?: "rose" | "sage" | "cream" | "ink";
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  const imageAttrs = getResponsiveImageAttrs(src, sizes);

  if (failed) {
    return <FilmPlaceholder title={title} tone={tone} />;
  }

  return (
    <div className={`img-blur-wrap ${loaded ? "is-loaded" : ""} ${className || ""}`}>
      <div className="img-skeleton" aria-hidden="true" />
      <img
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        {...imageAttrs}
        alt={alt}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
