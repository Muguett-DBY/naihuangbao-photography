import { forwardRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(function PageTransition(
  { children, className },
  ref,
) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <span className="page-transition-exposure" aria-hidden="true" />
      <motion.div
        ref={ref}
        className={`page-transition${className ? ` ${className}` : ""}`}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
});
