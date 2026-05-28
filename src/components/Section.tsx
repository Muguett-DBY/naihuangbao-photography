import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="section-shell is-visible">
      <div className="section-heading">
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {intro ? <span>{intro}</span> : null}
      </div>
      <div className="section-body is-visible">
        {children}
      </div>
    </section>
  );
}
