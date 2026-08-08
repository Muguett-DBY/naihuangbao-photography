type PreloadTask = () => Promise<unknown>;

export type RoutePreloader = (target: string) => Promise<boolean>;

function normalizeRouteTarget(target: string): string {
  const [withoutHash] = target.split("#", 1);
  const [pathname] = withoutHash.split("?", 1);
  return pathname || "/";
}

function findLoaderKey(pathname: string, loaders: Record<string, PreloadTask>) {
  if (loaders[pathname]) return pathname;
  const segments = pathname.split("/").filter(Boolean);
  return Object.keys(loaders).find((pattern) => {
    const patternSegments = pattern.split("/").filter(Boolean);
    return patternSegments.length === segments.length
      && patternSegments.every((segment, index) => segment.startsWith(":") || segment === segments[index]);
  });
}

export function createRoutePreloader(loaders: Record<string, PreloadTask>): RoutePreloader {
  const cache = new Map<string, Promise<boolean>>();

  return (target: string): Promise<boolean> => {
    const pathname = normalizeRouteTarget(target);
    const loaderKey = findLoaderKey(pathname, loaders);
    if (!loaderKey) return Promise.resolve(false);
    const loader = loaders[loaderKey];
    if (!loader) return Promise.resolve(false);

    const cached = cache.get(loaderKey);
    if (cached) return cached;

    const preload = loader()
      .then(() => true)
      .catch((error: unknown) => {
        cache.delete(loaderKey);
        throw error;
      });
    cache.set(loaderKey, preload);
    return preload;
  };
}
