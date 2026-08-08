import { useEffect } from "react";
import { useLocation } from "react-router";
import { practiceHubRoute, practiceNavigation } from "../../data/product-navigation";

const noIndexPrefixes = [practiceHubRoute, ...practiceNavigation]
  .map((route) => route.to)
  .filter((path) => path !== "/gallery" && path !== "/map");

export function RouteIndexingPolicy() {
  const { pathname } = useLocation();

  useEffect(() => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    const noIndex = noIndexPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    meta.content = noIndex ? "noindex,follow" : "index,follow";
  }, [pathname]);

  return null;
}
