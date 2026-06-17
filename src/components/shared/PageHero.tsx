import { memo, type ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backLink?: ReactNode;
};

export const PageHero = memo(function PageHero({ eyebrow, title, subtitle, backLink }: PageHeroProps) {
  return (
    <section className="page-hero" id="top">
      <div className="page-hero-heading">
        {backLink}
        <p className="section-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <span>{subtitle}</span>}
      </div>
    </section>
  );
});
