import { useState, type ReactNode } from "react";

export type CatalogueMediaKind = "course" | "preset" | "workshop" | "object";

type CatalogueCardMediaProps = {
  alt: string;
  children?: ReactNode;
  className?: string;
  imageClassName: string;
  imageUrl?: string | null;
  index: number;
  kind: CatalogueMediaKind;
};

const CATALOGUE_FALLBACK_IMAGES: Readonly<Record<CatalogueMediaKind, readonly string[]>> = Object.freeze({
  course: [
    "/images/gallery/gallery-garden-01.webp",
    "/images/gallery/gallery-daily-01.webp",
    "/images/gallery/gallery-sweet-01.webp",
  ],
  preset: [
    "/images/gallery/gallery-urban-01.webp",
    "/images/gallery/gallery-jiangnan-01.webp",
    "/images/gallery/gallery-flower-01.webp",
  ],
  workshop: [
    "/images/gallery/gallery-jiangnan-01.webp",
    "/images/gallery/gallery-garden-01.webp",
    "/images/gallery/gallery-urban-01.webp",
  ],
  object: [
    "/images/gallery/gallery-daily-01.webp",
    "/images/gallery/gallery-sweet-01.webp",
    "/images/gallery/gallery-flower-01.webp",
  ],
});

const CATALOGUE_MEDIA_CODES: Readonly<Record<CatalogueMediaKind, string>> = Object.freeze({
  course: "COURSE FRAME",
  preset: "GRADE TEST",
  workshop: "FIELD FRAME",
  object: "OBJECT MOOD",
});

function OpticalMediaChrome({ index, kind }: Pick<CatalogueCardMediaProps, "index" | "kind">) {
  return (
    <span className="catalogue-media-chrome" aria-hidden="true">
      <span className="catalogue-media-code">{CATALOGUE_MEDIA_CODES[kind]}</span>
      <span className="catalogue-media-frame">FR {String(index + 1).padStart(2, "0")}</span>
      <span className="catalogue-media-reticle"><i /></span>
      <span className="catalogue-media-meter"><i /><i /><i /><i /><i /></span>
    </span>
  );
}

export function CatalogueCardMedia({
  alt,
  children,
  className,
  imageClassName,
  imageUrl,
  index,
  kind,
}: CatalogueCardMediaProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const mediaClassName = `catalogue-card-media catalogue-card-media--${kind}${className ? ` ${className}` : ""}`;
  const canRenderSource = Boolean(imageUrl) && imageUrl !== failedImageUrl;

  if (canRenderSource) {
    return (
      <div className={mediaClassName}>
        <img
          src={imageUrl ?? undefined}
          alt={alt}
          className={imageClassName}
          loading="lazy"
          onError={() => setFailedImageUrl(imageUrl ?? null)}
        />
        {children}
        <OpticalMediaChrome index={index} kind={kind} />
      </div>
    );
  }

  const fallbackImages = CATALOGUE_FALLBACK_IMAGES[kind];
  const primaryImage = fallbackImages[index % fallbackImages.length];
  const secondaryImage = fallbackImages[(index + 1) % fallbackImages.length];

  return (
    <div
      className={`${mediaClassName} catalogue-card-media--fallback`}
      data-fallback="true"
    >
      <span className="catalogue-fallback-contact-sheet" aria-hidden="true">
        <img src={primaryImage} alt="" loading="lazy" />
        <img src={secondaryImage} alt="" loading="lazy" />
      </span>
      <span className="catalogue-fallback-label" aria-hidden="true">VISUAL STUDY</span>
      <span className="catalogue-fallback-reference" aria-hidden="true">{CATALOGUE_MEDIA_CODES[kind]} / NHB</span>
      {children}
      <OpticalMediaChrome index={index} kind={kind} />
    </div>
  );
}
