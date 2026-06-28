import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RootLayout } from "./layouts/RootLayout";
import { NotFound } from "./components/NotFound";
import { routeLoaders } from "./lib/route-preload";

const HomePage = lazy(routeLoaders["/"]);
const GalleryPage = lazy(routeLoaders["/gallery"]);
const CoursesPage = lazy(routeLoaders["/courses"]);
const CourseDetailPage = lazy(routeLoaders["/courses/:id"]);
const ProductsPage = lazy(routeLoaders["/products"]);
const PresetDetailPage = lazy(routeLoaders["/presets/:id"]);
const WorkshopsPage = lazy(routeLoaders["/workshops"]);
const WorkshopDetailPage = lazy(routeLoaders["/workshops/:id"]);
const ShopPage = lazy(routeLoaders["/shop"]);
const ShopDetailPage = lazy(routeLoaders["/shop/:id"]);
const BookingPage = lazy(routeLoaders["/booking"]);
const MapPage = lazy(routeLoaders["/map"]);
const LoginPage = lazy(routeLoaders["/login"]);
const DashboardPage = lazy(routeLoaders["/dashboard"]);
const PhotoDetailPage = lazy(routeLoaders["/gallery/:id"]);
const PhotoEditorPage = lazy(routeLoaders["/editor"]);
const ComparePage = lazy(routeLoaders["/compare"]);
const AdminDashboard = lazy(routeLoaders["/admin"]);

function AdminRoute() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="adm-root"><div className="adm-loading">{t("common.loading")}</div></div>}>
      <AdminDashboard />
    </Suspense>
  );
}

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "var(--caramel-muted, #7F5A44)",
        fontSize: 14,
      }}>
        <div className="adm-loading-dots">
          <span /><span /><span />
        </div>
      </div>
    }>
      {children}
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
      { index: true, element: <PageSuspense><HomePage /></PageSuspense> },
      { path: "gallery", element: <PageSuspense><GalleryPage /></PageSuspense> },
      { path: "gallery/:id", element: <PageSuspense><PhotoDetailPage /></PageSuspense> },
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
      { path: "login", element: <PageSuspense><LoginPage /></PageSuspense> },
      { path: "dashboard", element: <PageSuspense><DashboardPage /></PageSuspense> },
      { path: "editor", element: <PageSuspense><PhotoEditorPage /></PageSuspense> },
      { path: "compare", element: <PageSuspense><ComparePage /></PageSuspense> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
