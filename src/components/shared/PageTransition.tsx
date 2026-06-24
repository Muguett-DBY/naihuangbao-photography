import { forwardRef, lazy, Suspense, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const LazyMotion = lazy(async () => {
  const { motion } = await import("framer-motion");
  return {
    default: forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(function LazyMotionInner({ children, className }, ref) {
      return (
        <motion.div
          ref={ref}
          className={className}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      );
    }),
  };
});

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(function PageTransition(
  { children, className },
  ref,
) {
  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <LazyMotion ref={ref} className={className}>
        {children}
      </LazyMotion>
    </Suspense>
  );
});
