type PreloadTask = () => Promise<unknown>;

export type RoutePreloader = (target: string) => Promise<boolean>;

function normalizeRouteTarget(target: string): string {
  const [withoutHash] = target.split("#", 1);
  const [pathname] = withoutHash.split("?", 1);
  return pathname || "/";
}

export function createRoutePreloader(loaders: Record<string, PreloadTask>): RoutePreloader {
  const cache = new Map<string, Promise<boolean>>();

  return (target: string): Promise<boolean> => {
    const pathname = normalizeRouteTarget(target);
    const loader = loaders[pathname];
    if (!loader) return Promise.resolve(false);

    const cached = cache.get(pathname);
    if (cached) return cached;

    const preload = loader()
      .then(() => true)
      .catch((error: unknown) => {
        cache.delete(pathname);
        throw error;
      });
    cache.set(pathname, preload);
    return preload;
  };
}
