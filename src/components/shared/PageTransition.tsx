import { forwardRef, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(function PageTransition(
  { children, className },
  ref,
) {
  return (
    <>
      <span className="page-transition-exposure" aria-hidden="true" />
      <div
        ref={ref}
        className={`page-transition${className ? ` ${className}` : ""}`}
      >
        {children}
      </div>
    </>
  );
});
