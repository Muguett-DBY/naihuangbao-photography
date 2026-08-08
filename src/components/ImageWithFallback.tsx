import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getResponsiveImageAttrs } from "../lib/responsive-image";
import { getResponsivePictureAttrs } from "../lib/responsive-picture";
import { FilmPlaceholder } from "./FilmPlaceholder";

export const ImageWithFallback = memo(function ImageWithFallback({
  src,
  alt,
  title,
  tone = "rose",
  className,
  priority = false,
  load = true,
  sizes,
  transitionName,
}: {
  src: string;
  alt: string;
  title: string;
  tone?: "rose" | "sage" | "cream" | "ink";
  className?: string;
  priority?: boolean;
  load?: boolean;
  sizes?: string;
  transitionName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [useDirectImg, setUseDirectImg] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const pictureAttrs = !useDirectImg ? getResponsivePictureAttrs(src, sizes) : null;
  const usePicture = Boolean(pictureAttrs && pictureAttrs.sources.length > 0);
  const imageAttrs = !usePicture ? getResponsiveImageAttrs(src, sizes) : null;

  const handleError = () => {
    if (usePicture) {
      setUseDirectImg(true);
    } else {
      setFailed(true);
    }
  };

  const markLoaded = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.classList.add("is-loaded");
    wrapper.dataset.state = "loaded";
    wrapper.setAttribute("aria-busy", "false");
  }, []);

  useEffect(() => {
    setFailed(false);
    setUseDirectImg(false);
    const wrapper = wrapperRef.current;
    wrapper?.classList.remove("is-loaded");
    if (wrapper) {
      wrapper.dataset.state = "loading";
      wrapper.setAttribute("aria-busy", "true");
    }
    const image = imgRef.current;
    if (!src || !image) {
      if (!src) setFailed(true);
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      markLoaded();
    }
  }, [markLoaded, src]);

  if (!src) {
    return <FilmPlaceholder title={title} tone={tone} />;
  }

  if (!load) {
    const toneBg: Record<string, string> = {
      rose: "linear-gradient(135deg, rgba(230,190,180,0.3), rgba(210,170,160,0.15))",
      sage: "linear-gradient(135deg, rgba(180,200,180,0.3), rgba(160,185,165,0.15))",
      cream: "linear-gradient(135deg, rgba(240,220,200,0.3), rgba(220,200,180,0.15))",
      ink: "linear-gradient(135deg, rgba(180,165,155,0.3), rgba(160,145,135,0.15))",
    };
    return (
      <div className={`img-blur-wrap gallery-image-placeholder tone-${tone} ${className || ""}`} aria-hidden="true">
        <div className="gallery-skeleton" style={{ background: toneBg[tone] || toneBg.cream }} />
        <span className="gallery-skeleton-title">{title}</span>
      </div>
    );
  }

  if (failed) {
    return <FilmPlaceholder title={title} tone={tone} />;
  }

  return (
    <div
      ref={wrapperRef}
      className={`img-blur-wrap ${className || ""}`}
      data-state="loading"
      data-photo-transition={transitionName || undefined}
      style={transitionName ? ({ viewTransitionName: transitionName } as CSSProperties) : undefined}
      aria-busy="true"
    >
      <div className="img-skeleton gallery-skeleton" aria-hidden="true" />
      {usePicture && pictureAttrs ? (
        <picture>
          {pictureAttrs.sources.map((source) => (
            <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />
          ))}
          <img
            ref={imgRef}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={960}
            height={1200}
            src={pictureAttrs.fallback.src}
            srcSet={pictureAttrs.fallback.srcSet}
            sizes={pictureAttrs.fallback.sizes}
            alt={alt}
            onError={handleError}
            onLoad={markLoaded}
          />
        </picture>
      ) : (
        <img
          ref={imgRef}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          width={960}
          height={1200}
          {...(imageAttrs || { src })}
          alt={alt}
          onError={() => setFailed(true)}
          onLoad={markLoaded}
        />
      )}
    </div>
  );
});
