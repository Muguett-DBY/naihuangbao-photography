import type { ComponentProps } from "react";
import { Link } from "react-router";
import { logAndIgnore } from "../../lib/errors";
import { useRoutePreloader } from "../../routing/RoutePreloadProvider";
import { prepareViewTransition } from "../../lib/view-transition";

type PrefetchLinkProps = ComponentProps<typeof Link>;

export function PrefetchLink({
  onFocus,
  onClick,
  onPointerEnter,
  onTouchStart,
  to,
  viewTransition = true,
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
      viewTransition={viewTransition}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && viewTransition && typeof to === "string") {
          prepareViewTransition(window.location.pathname, to.split(/[?#]/, 1)[0]);
        }
      }}
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
