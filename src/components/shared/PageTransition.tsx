import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

interface PageTransitionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(function PageTransition(
  { children, className, ...props },
  ref,
) {
  return (
    <>
      <span className="page-transition-exposure" aria-hidden="true" />
      <div
        ref={ref}
        className={`page-transition${className ? ` ${className}` : ""}`}
        {...props}
      >
        {children}
      </div>
    </>
  );
});
