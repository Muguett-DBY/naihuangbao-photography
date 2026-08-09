import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { RootLayout } from "./layouts/RootLayout";
import { NotFound } from "./components/NotFound";
import { createRoutePreloader } from "./lib/route-preload";
import { routeLoaders } from "./routing/route-loaders";

export const preloadRoute = createRoutePreloader(routeLoaders);

const HomePage = lazy(routeLoaders["/"]);
const ArchivePage = lazy(routeLoaders["/archive"]);
const ArchiveProjectPage = lazy(routeLoaders["/archive/:id"]);
const AssetVaultPage = lazy(routeLoaders["/vault"]);
const StoriesPage = lazy(routeLoaders["/stories"]);
const VisualStoryPage = lazy(routeLoaders["/stories/:id"]);
const CreateHubPage = lazy(routeLoaders["/create"]);
const SceneComposerPage = lazy(routeLoaders["/compose"]);
const CreativeCuratorPage = lazy(routeLoaders["/curate"]);
const StoryBuilderPage = lazy(routeLoaders["/create/story"]);
const CreativeStudioPage = lazy(routeLoaders["/studio"]);
const ProjectsPage = lazy(routeLoaders["/projects"]);
const PublishedProjectPage = lazy(routeLoaders["/share/:slug"]);
const LabPage = lazy(routeLoaders["/lab"]);
const PracticePage = lazy(routeLoaders["/practice"]);
const AboutPage = lazy(routeLoaders["/about"]);
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
const PracticeLayout = lazy(routeLoaders.$practice);

function AdminRoute() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="adm-root"><div className="adm-loading">{t("common.loading")}</div></div>}>
      <AdminDashboard />
    </Suspense>
  );
}

function HomePremiereFallback() {
  const { t } = useTranslation();

  return (
    <section className="hero hero-home home-premiere-fallback" aria-label={t("nav.home")}>
      <div className="cinematic-premiere" aria-hidden="true">
        <div className="cinematic-premiere__opening">
          <picture>
            <source
              type="image/avif"
              srcSet="/images/visual-os-v8/640/01-cream-paper-pavilion.avif?v=20260809-8 640w, /images/visual-os-v8/960/01-cream-paper-pavilion.avif?v=20260809-8 960w, /images/visual-os-v8/01-cream-paper-pavilion.avif?v=20260809-8 1536w"
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcSet="/images/visual-os-v8/640/01-cream-paper-pavilion.webp?v=20260809-8 640w, /images/visual-os-v8/960/01-cream-paper-pavilion.webp?v=20260809-8 960w, /images/visual-os-v8/01-cream-paper-pavilion.webp?v=20260809-8 1536w"
              sizes="100vw"
            />
            <img
              src="/images/visual-os-v8/01-cream-paper-pavilion.webp?v=20260809-8"
              alt=""
              width="1536"
              height="1024"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
      </div>
      <div className="hero-solid-scrim" aria-hidden="true" />
      <div className="hero-editorial-copy">
        <p className="hero-concept-label">{t("opticalArchive.label")}</p>
        <h1 className="hero-title">{t("seo.siteName")}</h1>
        <p className="hero-intro">{t("platform.playground.intro", "A personal visual playground for light, color, paper, and local creative tools.")}</p>
        <div className="hero-actions">
          <a className="hero-create-primary" href="/create">{t("platform.playground.startCreating", "Start creating")}</a>
          <a className="hero-cover-primary-btn" href="/archive">{t("nav.archive")}</a>
        </div>
      </div>
    </section>
  );
}

function PageSuspense({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <Suspense fallback={fallback ?? (
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
    )}>
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
      { index: true, element: <PageSuspense fallback={<HomePremiereFallback />}><HomePage /></PageSuspense> },
      { path: "archive", element: <PageSuspense><ArchivePage /></PageSuspense> },
      { path: "archive/:id", element: <PageSuspense><ArchiveProjectPage /></PageSuspense> },
      { path: "vault", element: <PageSuspense><AssetVaultPage /></PageSuspense> },
      { path: "stories", element: <PageSuspense><StoriesPage /></PageSuspense> },
      { path: "stories/:id", element: <PageSuspense><VisualStoryPage /></PageSuspense> },
      { path: "create", element: <PageSuspense><CreateHubPage /></PageSuspense> },
      { path: "compose", element: <PageSuspense><SceneComposerPage /></PageSuspense> },
      { path: "curate", element: <PageSuspense><CreativeCuratorPage /></PageSuspense> },
      { path: "create/story", element: <PageSuspense><StoryBuilderPage /></PageSuspense> },
      { path: "studio", element: <PageSuspense><CreativeStudioPage /></PageSuspense> },
      { path: "projects", element: <PageSuspense><ProjectsPage /></PageSuspense> },
      { path: "share/:slug", element: <PageSuspense><PublishedProjectPage /></PageSuspense> },
      { path: "about", element: <PageSuspense><AboutPage /></PageSuspense> },
      { path: "editor", element: <PageSuspense><PhotoEditorPage /></PageSuspense> },
      {
        element: <PageSuspense><PracticeLayout /></PageSuspense>,
        children: [
          { path: "practice", element: <PageSuspense><PracticePage /></PageSuspense> },
          { path: "lab", element: <Navigate to="/practice" replace /> },
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
          { path: "compare", element: <PageSuspense><ComparePage /></PageSuspense> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
