import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { HomePage } from "./pages/HomePage";
import { GalleryPage } from "./pages/GalleryPage";
import { CoursesPage } from "./pages/CoursesPage";
import { ProductsPage } from "./pages/ProductsPage";
import { WorkshopsPage } from "./pages/WorkshopsPage";
import { ShopPage } from "./pages/ShopPage";
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
      { path: "products", element: <ProductsPage /> },
      { path: "workshops", element: <WorkshopsPage /> },
      { path: "shop", element: <ShopPage /> },
      { path: "booking", element: <BookingPage /> },
      { path: "map", element: <MapPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
