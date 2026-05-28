import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { HomePage } from "./pages/HomePage";
import { GalleryPage } from "./pages/GalleryPage";
import { CoursesPage } from "./pages/CoursesPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PresetDetailPage } from "./pages/PresetDetailPage";
import { WorkshopsPage } from "./pages/WorkshopsPage";
import { WorkshopDetailPage } from "./pages/WorkshopDetailPage";
import { ShopPage } from "./pages/ShopPage";
import { ShopDetailPage } from "./pages/ShopDetailPage";
import { BookingPage } from "./pages/BookingPage";
import { MapPage } from "./pages/MapPage";
import { NotFound } from "./components/NotFound";

const AdminDashboard = lazy(async () => {
  await import("./styles/admin.css");
  return import("./components/AdminDashboard");
});

function AdminRoute() {
  return (
    <Suspense fallback={<div className="adm-root"><div className="adm-loading">加载中...</div></div>}>
      <AdminDashboard />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminRoute />,
  },
  {
    path: "/admin/*",
    element: <AdminRoute />,
  },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "gallery", element: <GalleryPage /> },
      { path: "courses", element: <CoursesPage /> },
      { path: "courses/:id", element: <CourseDetailPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "presets/:id", element: <PresetDetailPage /> },
      { path: "workshops", element: <WorkshopsPage /> },
      { path: "workshops/:id", element: <WorkshopDetailPage /> },
      { path: "shop", element: <ShopPage /> },
      { path: "shop/:id", element: <ShopDetailPage /> },
      { path: "booking", element: <BookingPage /> },
      { path: "map", element: <MapPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
