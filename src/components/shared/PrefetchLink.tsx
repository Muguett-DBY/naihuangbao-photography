import type { ComponentProps } from "react";
import { Link } from "react-router-dom";
import { preloadRoute } from "../../lib/route-preload";
import { logAndIgnore } from "../../lib/errors";

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
      void preloadRoute(to).catch((error) => {
        logAndIgnore("Route preload failed", error);
      });
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
