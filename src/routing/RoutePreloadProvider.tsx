import { createContext, useContext, type ReactNode } from "react";
import type { RoutePreloader } from "../lib/route-preload";

const noopPreloader: RoutePreloader = async () => false;
const RoutePreloadContext = createContext<RoutePreloader>(noopPreloader);

type RoutePreloadProviderProps = {
  children: ReactNode;
  preloadRoute: RoutePreloader;
};

export function RoutePreloadProvider({ children, preloadRoute }: RoutePreloadProviderProps) {
  return (
    <RoutePreloadContext.Provider value={preloadRoute}>
      {children}
    </RoutePreloadContext.Provider>
  );
}

export function useRoutePreloader() {
  return useContext(RoutePreloadContext);
}
