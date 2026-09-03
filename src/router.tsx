import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { RootLayout } from "./layouts/RootLayout";
import { NotFound } from "./components/NotFound";
import { createRoutePreloader } from "./lib/route-preload";
import { routeLoaders } from "./routing/route-loaders";
import { RouteLoadingState } from "./components/shared/RouteLoadingState";

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
const LawAcademyPage = lazy(routeLoaders["/law"]);
const LawSubjectPage = lazy(routeLoaders["/law/:subjectId"]);
const LawLessonPage = lazy(routeLoaders["/law/learn/:lessonId"]);
const LawGraphicPage = lazy(routeLoaders["/law/graphic/:lessonId"]);
const LoginPage = lazy(routeLoaders["/login"]);
const DashboardPage = lazy(routeLoaders["/dashboard"]);
const PhotoDetailPage = lazy(routeLoaders["/gallery/:id"]);
const PhotoEditorPage = lazy(routeLoaders["/editor"]);
const ComparePage = lazy(routeLoaders["/compare"]);
const AdminDashboard = lazy(routeLoaders["/admin"]);
const AuthLayout = lazy(routeLoaders.$auth);
const CustomerLayout = lazy(routeLoaders.$customer);
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
    <section className="hero home-premiere-fallback" aria-label={t("nav.home")}>
      <picture className="home-premiere-fallback__media" aria-hidden="true">
        <source type="image/avif" srcSet="/images/gallery/640/gallery-jiangnan-01.avif 640w, /images/gallery/960/gallery-jiangnan-01.avif 960w" sizes="100vw" />
        <source type="image/webp" srcSet="/images/gallery/640/gallery-jiangnan-01.webp 640w, /images/gallery/960/gallery-jiangnan-01.webp 960w" sizes="100vw" />
        <img src="/images/gallery/gallery-jiangnan-01.webp" alt="" width="1200" height="1600" loading="eager" fetchPriority="high" decoding="async" />
      </picture>
      <div className="hero-editorial-copy">
        <p className="hero-concept-label">{t("hero.brandPrefix")}</p>
        <h1 className="hero-title">{t("seo.siteName")}</h1>
        <p className="hero-intro">{t("hero.intro")}</p>
        <div className="hero-actions">
          <a className="hero-cover-primary-btn" href="/booking">{t("nav.booking")}</a>
          <a className="hero-gallery-link" href="/gallery">{t("nav.gallery")}</a>
        </div>
      </div>
    </section>
  );
}

function PageSuspense({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <Suspense fallback={fallback ?? <RouteLoadingState />}>
      {children}
    </Suspense>
  );
}

function CustomerLayoutFallback() {
  const location = useLocation();
  return location.pathname === "/" ? <HomePremiereFallback /> : <RouteLoadingState />;
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
      {
        element: <PageSuspense fallback={<CustomerLayoutFallback />}><CustomerLayout /></PageSuspense>,
        children: [
          { index: true, element: <PageSuspense fallback={<HomePremiereFallback />}><HomePage /></PageSuspense> },
          { path: "archive", element: <PageSuspense><ArchivePage /></PageSuspense> },
          { path: "about", element: <PageSuspense><AboutPage /></PageSuspense> },
          { path: "gallery", element: <PageSuspense><GalleryPage /></PageSuspense> },
          { path: "gallery/:id", element: <PageSuspense><PhotoDetailPage /></PageSuspense> },
          { path: "booking", element: <PageSuspense><BookingPage /></PageSuspense> },
          { path: "map", element: <PageSuspense><MapPage /></PageSuspense> },
          { path: "law", element: <PageSuspense><LawAcademyPage /></PageSuspense> },
          { path: "law/:subjectId", element: <PageSuspense><LawSubjectPage /></PageSuspense> },
          { path: "law/learn/:lessonId", element: <PageSuspense><LawLessonPage /></PageSuspense> },
          { path: "law/graphic/:lessonId", element: <PageSuspense><LawGraphicPage /></PageSuspense> },
          {
            element: <PageSuspense><PracticeLayout /></PageSuspense>,
            children: [
              { path: "practice", element: <PageSuspense><PracticePage /></PageSuspense> },
              { path: "lab", element: <Navigate to="/practice" replace /> },
              { path: "courses", element: <PageSuspense><CoursesPage /></PageSuspense> },
              { path: "courses/:id", element: <PageSuspense><CourseDetailPage /></PageSuspense> },
              { path: "products", element: <PageSuspense><ProductsPage /></PageSuspense> },
              { path: "presets/:id", element: <PageSuspense><PresetDetailPage /></PageSuspense> },
              { path: "workshops", element: <PageSuspense><WorkshopsPage /></PageSuspense> },
              { path: "workshops/:id", element: <PageSuspense><WorkshopDetailPage /></PageSuspense> },
              { path: "shop", element: <PageSuspense><ShopPage /></PageSuspense> },
              { path: "shop/:id", element: <PageSuspense><ShopDetailPage /></PageSuspense> },
              { path: "compare", element: <PageSuspense><ComparePage /></PageSuspense> },
            ],
          },
        ],
      },
      {
        element: <PageSuspense><AuthLayout /></PageSuspense>,
        children: [
          { path: "login", element: <PageSuspense><LoginPage /></PageSuspense> },
          { path: "dashboard", element: <PageSuspense><DashboardPage /></PageSuspense> },
        ],
      },
      { path: "editor", element: <PageSuspense><PhotoEditorPage /></PageSuspense> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
