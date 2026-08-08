import "../../styles/route-art-direction.css";
import { memo, type ReactNode } from "react";
import type { ScenePresetId } from "../../experience/scene-presets";
import { useImmersiveAnchor } from "../../experience/useImmersiveAnchor";
import { getResponsivePictureAttrs } from "../../lib/responsive-picture";
import { OpticalSceneChrome } from "./OpticalSceneChrome";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backLink?: ReactNode;
  image?: string;
  imageAlt?: string;
  issue?: string;
  immersivePreset?: ScenePresetId;
  immersiveImages?: readonly string[];
};

const EMPTY_IMMERSIVE_IMAGES: readonly string[] = Object.freeze([]);

export const PageHero = memo(function PageHero({
  eyebrow,
  title,
  subtitle,
  backLink,
  image,
  imageAlt,
  issue,
  immersivePreset,
  immersiveImages,
}: PageHeroProps) {
  const immersiveAnchor = useImmersiveAnchor({
    id: `page-hero:${immersivePreset ?? "boundary"}`,
    preset: immersivePreset ?? "boundary",
    imageUrls: immersiveImages ?? EMPTY_IMMERSIVE_IMAGES,
  });
  const shouldRegisterImmersiveAnchor = immersivePreset !== undefined && immersiveImages !== undefined;
  const pictureAttrs = image ? getResponsivePictureAttrs(image, "100vw") : null;

  return (
    <section
      ref={shouldRegisterImmersiveAnchor ? immersiveAnchor : undefined}
      className={`page-hero${image ? " page-hero--media" : ""}`}
      id="top"
      aria-labelledby="page-hero-title"
      data-immersive-anchor={shouldRegisterImmersiveAnchor ? immersivePreset : undefined}
      data-page-hero={immersivePreset}
    >
      {image && pictureAttrs && (
        <picture className="page-hero-media">
          {pictureAttrs.sources.map((source) => (
            <source key={source.type} srcSet={source.srcSet} sizes={source.sizes} type={source.type} />
          ))}
          <img
            src={pictureAttrs.fallback.src}
            srcSet={pictureAttrs.fallback.srcSet}
            sizes={pictureAttrs.fallback.sizes}
            alt={imageAlt || title}
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      )}
      {immersivePreset && <OpticalSceneChrome preset={immersivePreset} />}
      {immersivePreset && (
        <div className="page-hero-optical-axis" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="page-hero-heading">
        {backLink}
        <div className="page-hero-ledger">
          {issue && <span className="page-hero-issue">{issue}</span>}
          <p className="section-eyebrow">{eyebrow}</p>
        </div>
        <h1 id="page-hero-title">{title}</h1>
        {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
      </div>
    </section>
  );
});
