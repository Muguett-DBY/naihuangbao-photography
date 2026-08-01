import type { ComponentType } from "react";

export type RouteLoader = () => Promise<{ default: ComponentType }>;

function asDefault<T extends ComponentType>(component: T) {
  return { default: component };
}

export const routeLoaders = {
  "/": () => import("../pages/HomePage").then((module) => asDefault(module.HomePage)),
  "/gallery": () => import("../pages/GalleryPage").then((module) => asDefault(module.GalleryPage)),
  "/gallery/:id": () => import("../pages/PhotoDetailPage").then((module) => asDefault(module.PhotoDetailPage)),
  "/courses": () => import("../pages/CoursesPage").then((module) => asDefault(module.CoursesPage)),
  "/courses/:id": () => import("../pages/CourseDetailPage").then((module) => asDefault(module.CourseDetailPage)),
  "/products": () => import("../pages/ProductsPage").then((module) => asDefault(module.ProductsPage)),
  "/presets/:id": () => import("../pages/PresetDetailPage").then((module) => asDefault(module.PresetDetailPage)),
  "/workshops": () => import("../pages/WorkshopsPage").then((module) => asDefault(module.WorkshopsPage)),
  "/workshops/:id": () => import("../pages/WorkshopDetailPage").then((module) => asDefault(module.WorkshopDetailPage)),
  "/shop": () => import("../pages/ShopPage").then((module) => asDefault(module.ShopPage)),
  "/shop/:id": () => import("../pages/ShopDetailPage").then((module) => asDefault(module.ShopDetailPage)),
  "/booking": () => import("../pages/BookingPage").then((module) => asDefault(module.BookingPage)),
  "/map": () => import("../pages/MapPage").then((module) => asDefault(module.MapPage)),
  "/login": () => import("../pages/LoginPage").then((module) => asDefault(module.LoginPage)),
  "/dashboard": () => import("../pages/DashboardPage").then((module) => asDefault(module.DashboardPage)),
  "/editor": () => import("../pages/PhotoEditorPage"),
  "/compare": () => import("../pages/ComparePage").then((module) => asDefault(module.ComparePage)),
  "/admin": async () => {
    await import("../styles/admin.css");
    return import("../components/AdminDashboard");
  },
} satisfies Record<string, RouteLoader>;
