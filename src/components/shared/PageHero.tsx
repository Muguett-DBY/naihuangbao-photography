import { memo, type ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backLink?: ReactNode;
  image?: string;
  imageAlt?: string;
  issue?: string;
};

function alternateImageSource(image: string, extension: "avif" | "webp") {
  return image.replace(/\.(?:avif|webp)(\?.*)?$/i, `.${extension}$1`);
}

export const PageHero = memo(function PageHero({
  eyebrow,
  title,
  subtitle,
  backLink,
  image,
  imageAlt,
  issue,
}: PageHeroProps) {
  return (
    <section className={`page-hero${image ? " page-hero--media" : ""}`} id="top" aria-labelledby="page-hero-title">
      {image && (
        <picture className="page-hero-media">
          <source srcSet={alternateImageSource(image, "avif")} type="image/avif" />
          <source srcSet={alternateImageSource(image, "webp")} type="image/webp" />
          <img src={image} alt={imageAlt || title} width={1920} height={1280} fetchPriority="high" />
        </picture>
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
