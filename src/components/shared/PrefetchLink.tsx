import type { ComponentProps } from "react";
import { Link } from "react-router-dom";
import { preloadRoute } from "../../lib/route-preload";

type PrefetchLinkProps = ComponentProps<typeof Link>;

export function PrefetchLink({
  onFocus,
  onPointerEnter,
  onTouchStart,
  to,
  ...props
}: PrefetchLinkProps) {
  const preload = () => {
    if (typeof to === "string") {
      void preloadRoute(to).catch(() => undefined);
    }
  };

  return (
    <Link
      {...props}
      to={to}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented) preload();
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (!event.defaultPrevented) preload();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        if (!event.defaultPrevented) preload();
      }}
    />
  );
}
