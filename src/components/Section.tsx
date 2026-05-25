import { motion } from "framer-motion";
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

/** Framer-motion enabled section with whileInView animation */
export function MotionSection({
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
    <motion.section
      id={id}
      className="section-shell"
      initial={{ opacity: 0, y: 32, clipPath: "inset(0 0 2% 0)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0 0 0 0)" }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="section-heading">
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {intro ? <span>{intro}</span> : null}
      </div>
      <div className="section-body">{children}</div>
    </motion.section>
  );
}
