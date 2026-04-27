import { useState } from "react";
import { FilmPlaceholder } from "./FilmPlaceholder";

export function ImageWithFallback({
  src,
  alt,
  title,
  tone = "rose",
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  title: string;
  tone?: "rose" | "sage" | "cream" | "ink";
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);

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
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
