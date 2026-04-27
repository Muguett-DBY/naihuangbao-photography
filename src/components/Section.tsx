import type { ReactNode } from "react";
import { useInView } from "../hooks/useInView";

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
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.08 });

  return (
    <section
      id={id}
      ref={ref}
      className={`section-shell ${inView ? "is-visible" : ""}`}
    >
      <div className="section-heading">
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {intro ? <span>{intro}</span> : null}
      </div>
      <div className={`section-body ${inView ? "is-visible" : ""}`}>
        {children}
      </div>
    </section>
  );
}
