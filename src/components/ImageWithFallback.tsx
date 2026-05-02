import { useEffect, useState } from "react";
import { getResponsiveImageAttrs } from "../lib/responsive-image";
import { FilmPlaceholder } from "./FilmPlaceholder";

export function ImageWithFallback({
  src,
  alt,
  title,
  tone = "rose",
  className,
  priority = false,
  load = true,
  sizes,
}: {
  src: string;
  alt: string;
  title: string;
  tone?: "rose" | "sage" | "cream" | "ink";
  className?: string;
  priority?: boolean;
  load?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  const imageAttrs = getResponsiveImageAttrs(src, sizes);

  useEffect(() => {
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  if (!load) {
    return (
      <div className={`img-blur-wrap gallery-image-placeholder ${className || ""}`} aria-hidden="true">
        <div className="gallery-skeleton" />
      </div>
    );
  }

  if (failed) {
    return <FilmPlaceholder title={title} tone={tone} />;
  }

  return (
    <div className={`img-blur-wrap ${loaded ? "is-loaded" : ""} ${className || ""}`}>
      <div className="img-skeleton gallery-skeleton" aria-hidden="true" />
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
