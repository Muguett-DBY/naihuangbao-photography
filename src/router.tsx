import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RootLayout } from "./layouts/RootLayout";
import { NotFound } from "./components/NotFound";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const GalleryPage = lazy(() => import("./pages/GalleryPage").then((m) => ({ default: m.GalleryPage })));
const CoursesPage = lazy(() => import("./pages/CoursesPage").then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage").then((m) => ({ default: m.CourseDetailPage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const PresetDetailPage = lazy(() => import("./pages/PresetDetailPage").then((m) => ({ default: m.PresetDetailPage })));
const WorkshopsPage = lazy(() => import("./pages/WorkshopsPage").then((m) => ({ default: m.WorkshopsPage })));
const WorkshopDetailPage = lazy(() => import("./pages/WorkshopDetailPage").then((m) => ({ default: m.WorkshopDetailPage })));
const ShopPage = lazy(() => import("./pages/ShopPage").then((m) => ({ default: m.ShopPage })));
const ShopDetailPage = lazy(() => import("./pages/ShopDetailPage").then((m) => ({ default: m.ShopDetailPage })));
const BookingPage = lazy(() => import("./pages/BookingPage").then((m) => ({ default: m.BookingPage })));
const MapPage = lazy(() => import("./pages/MapPage").then((m) => ({ default: m.MapPage })));

const AdminDashboard = lazy(async () => {
  await import("./styles/admin.css");
  return import("./components/AdminDashboard");
});

function AdminRoute() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="adm-root"><div className="adm-loading">{t("common.loading")}</div></div>}>
      <AdminDashboard />
    </Suspense>
  );
}

function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>{children}</Suspense>;
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
      { index: true, element: <PageSuspense><HomePage /></PageSuspense> },
      { path: "gallery", element: <PageSuspense><GalleryPage /></PageSuspense> },
      { path: "courses", element: <PageSuspense><CoursesPage /></PageSuspense> },
      { path: "courses/:id", element: <PageSuspense><CourseDetailPage /></PageSuspense> },
      { path: "products", element: <PageSuspense><ProductsPage /></PageSuspense> },
      { path: "presets/:id", element: <PageSuspense><PresetDetailPage /></PageSuspense> },
      { path: "workshops", element: <PageSuspense><WorkshopsPage /></PageSuspense> },
      { path: "workshops/:id", element: <PageSuspense><WorkshopDetailPage /></PageSuspense> },
      { path: "shop", element: <PageSuspense><ShopPage /></PageSuspense> },
      { path: "shop/:id", element: <PageSuspense><ShopDetailPage /></PageSuspense> },
      { path: "booking", element: <PageSuspense><BookingPage /></PageSuspense> },
      { path: "map", element: <PageSuspense><MapPage /></PageSuspense> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
