import { useState } from "react";
import { FilmPlaceholder } from "./FilmPlaceholder";

export function ImageWithFallback({
  src,
  alt,
  title,
  tone = "rose",
  className,
}: {
  src: string;
  alt: string;
  title: string;
  tone?: "rose" | "sage" | "cream" | "ink";
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return <FilmPlaceholder title={title} tone={tone} />;
  }

  return (
    <img
      className={className}
      loading="lazy"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
