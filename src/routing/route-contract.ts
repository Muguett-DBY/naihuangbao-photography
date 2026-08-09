export type RouteScope = "primary" | "practice" | "admin";

export type RouteContractEntry = {
  path: string;
  scope: RouteScope;
  dynamic?: boolean;
  staticShell?: boolean;
  edgeRedirect?: string;
};

export const routeContract = [
  { path: "/", scope: "primary" },
  { path: "/archive", scope: "primary" },
  { path: "/archive/:id", scope: "primary", dynamic: true, staticShell: true },
  { path: "/stories", scope: "primary" },
  { path: "/stories/:id", scope: "primary", dynamic: true, staticShell: true },
  { path: "/create", scope: "primary" },
  { path: "/create/story", scope: "primary" },
  { path: "/studio", scope: "primary" },
  { path: "/projects", scope: "primary" },
  { path: "/share/:slug", scope: "primary", dynamic: true },
  { path: "/about", scope: "primary" },
  { path: "/editor", scope: "primary" },
  { path: "/practice", scope: "practice" },
  { path: "/lab", scope: "practice", edgeRedirect: "/practice" },
  { path: "/gallery", scope: "practice" },
  { path: "/gallery/:id", scope: "practice", dynamic: true },
  { path: "/courses", scope: "practice" },
  { path: "/courses/:id", scope: "practice", dynamic: true },
  { path: "/products", scope: "practice" },
  { path: "/presets/:id", scope: "practice", dynamic: true },
  { path: "/workshops", scope: "practice" },
  { path: "/workshops/:id", scope: "practice", dynamic: true },
  { path: "/shop", scope: "practice" },
  { path: "/shop/:id", scope: "practice", dynamic: true },
  { path: "/booking", scope: "practice" },
  { path: "/map", scope: "practice" },
  { path: "/login", scope: "practice" },
  { path: "/dashboard", scope: "practice" },
  { path: "/compare", scope: "practice" },
  { path: "/admin", scope: "admin" },
] as const satisfies readonly RouteContractEntry[];

export type RouteLoaderPath = typeof routeContract[number]["path"];
