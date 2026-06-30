import "../styles/pages.css";
import { useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, CalendarCheck, ShoppingCart, BookOpen, MapPin, Image, Settings, Sparkles, ArrowRight, Heart, History } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { BookingsTab } from "../components/dashboard/BookingsTab";
import { MyPhotosTab } from "../components/dashboard/MyPhotosTab";
import { PurchasesTab } from "../components/dashboard/PurchasesTab";
import { CoursesTab } from "../components/dashboard/CoursesTab";
import { WorkshopsTab } from "../components/dashboard/WorkshopsTab";
import { ProfileTab } from "../components/dashboard/ProfileTab";
import { OverviewTab } from "../components/dashboard/OverviewTab";
import { FavoritesTab } from "../components/dashboard/FavoritesTab";
import { RecentlyViewedTab } from "../components/dashboard/RecentlyViewedTab";
import { DashboardWorkspace } from "../components/dashboard/DashboardWorkspace";

export function DashboardPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();

  useSEO({ titleKey: "dashboard.title", descKey: "dashboard.title", path: "/dashboard" });
  useGsapPageEffects(rootRef);

  if (authLoading) {
    return (
      <PageTransition ref={rootRef}>
        <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
          <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
            <h1>{t("dashboard.title")}</h1>
          </div>
        </section>
        <div className="section-shell is-visible">
          <div className="dashboard-loading">{t("common.loading")}</div>
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return <Navigate to="/login?from=dashboard" replace />;
  }

  const tabItems = [
    {
      key: "overview",
      label: t("dashboard.overview"),
      icon: <User size={17} />,
      content: <OverviewTab />,
    },
    {
      key: "bookings",
      label: t("dashboard.bookings"),
      icon: <CalendarCheck size={17} />,
      content: <BookingsTab />,
    },
    {
      key: "photos",
      label: t("dashboard.myPhotos"),
      icon: <Image size={17} />,
      content: <MyPhotosTab />,
    },
    {
      key: "favorites",
      label: t("favorites.title", "Favorites"),
      icon: <Heart size={17} />,
      content: <FavoritesTab />,
    },
    {
      key: "recently-viewed",
      label: t("recentlyViewed.tabLabel", "Recently viewed"),
      icon: <History size={17} />,
      content: <RecentlyViewedTab />,
    },
    {
      key: "purchases",
      label: t("dashboard.purchases"),
      icon: <ShoppingCart size={17} />,
      content: <PurchasesTab />,
    },
    {
      key: "courses",
      label: t("dashboard.courses"),
      icon: <BookOpen size={17} />,
      content: <CoursesTab />,
    },
    {
      key: "workshops",
      label: t("dashboard.workshops"),
      icon: <MapPin size={17} />,
      content: <WorkshopsTab />,
    },
    {
      key: "profile",
      label: t("dashboard.profile"),
      icon: <Settings size={17} />,
      content: <ProfileTab user={user} />,
    },
  ];

  return (
    <PageTransition ref={rootRef}>
      <section className="hero dashboard-hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading dashboard-hero-heading" style={{ position: "relative", zIndex: 1 }}>
          <h1>{t("dashboard.title")}</h1>
        </div>
      </section>

      <section className="section-shell is-visible">
        <ErrorBoundary>
          <div className="dashboard-root">
          <div className="dashboard-profile">
            <div className="dashboard-profile-main">
              <div className="dashboard-avatar">
                <User size={32} strokeWidth={1.5} />
              </div>
              <div className="dashboard-profile-info">
                <h3>{user.displayName}</h3>
                <p>{user.email}</p>
              </div>
            </div>
            <nav className="dashboard-profile-shortcuts" aria-label={t("dashboard.profileShortcuts", "Account shortcuts")}>
              <Link to="/booking" className="dashboard-profile-shortcut">
                <CalendarCheck size={15} aria-hidden="true" />
                <span>{t("dashboard.bookings")}</span>
              </Link>
              <Link to="/gallery" className="dashboard-profile-shortcut">
                <Image size={15} aria-hidden="true" />
                <span>{t("dashboard.quickGallery", "Browse Gallery")}</span>
              </Link>
              <Link to="/editor" className="dashboard-profile-shortcut">
                <Sparkles size={15} aria-hidden="true" />
                <span>{t("dashboard.quickEditor", "Open Editor")}</span>
              </Link>
            </nav>
          </div>

          <Link to="/editor" className="dashboard-editor-card">
            <span className="dashboard-editor-card__icon" aria-hidden="true">
              <Sparkles size={25} />
            </span>
            <span className="dashboard-editor-card__content">
              <strong>{t("dashboard.editorTitle")}</strong>
              <span>{t("dashboard.editorDescription")}</span>
            </span>
            <span className="dashboard-editor-card__action">
              {t("dashboard.openEditor")}
              <ArrowRight size={17} aria-hidden="true" />
            </span>
          </Link>

          <div className="dashboard-tabs">
            <DashboardWorkspace
              items={tabItems}
              defaultActiveKey="overview"
              ariaLabel={t("dashboard.workspaceNavigation")}
            />
          </div>
        </div>
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
