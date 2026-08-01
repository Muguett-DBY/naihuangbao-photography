import type { ComponentProps } from "react";
import { Link } from "react-router";
import { logAndIgnore } from "../../lib/errors";
import { useRoutePreloader } from "../../routing/RoutePreloadProvider";

type PrefetchLinkProps = ComponentProps<typeof Link>;

export function PrefetchLink({
  onFocus,
  onPointerEnter,
  onTouchStart,
  to,
  ...props
}: PrefetchLinkProps) {
  const preloadRoute = useRoutePreloader();
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
