import { useRef } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs } from "animal-island-ui";
import { User, CalendarCheck, ShoppingCart, BookOpen, MapPin, Image, Settings } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { PageTransition } from "../components/shared/PageTransition";
import { BookingsTab } from "../components/dashboard/BookingsTab";
import { MyPhotosTab } from "../components/dashboard/MyPhotosTab";
import { PurchasesTab } from "../components/dashboard/PurchasesTab";
import { CoursesTab } from "../components/dashboard/CoursesTab";
import { WorkshopsTab } from "../components/dashboard/WorkshopsTab";
import { ProfileTab } from "../components/dashboard/ProfileTab";
import { OverviewTab } from "../components/dashboard/OverviewTab";

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
    return <Navigate to="/login" replace />;
  }

  const tabItems = [
    {
      key: "overview",
      label: (
        <span className="dashboard-tab-label">
          <User size={16} />
          {t("dashboard.overview")}
        </span>
      ),
      children: <OverviewTab />,
    },
    {
      key: "bookings",
      label: (
        <span className="dashboard-tab-label">
          <CalendarCheck size={16} />
          {t("dashboard.bookings")}
        </span>
      ),
      children: <BookingsTab />,
    },
    {
      key: "photos",
      label: (
        <span className="dashboard-tab-label">
          <Image size={16} />
          {t("dashboard.myPhotos")}
        </span>
      ),
      children: <MyPhotosTab />,
    },
    {
      key: "purchases",
      label: (
        <span className="dashboard-tab-label">
          <ShoppingCart size={16} />
          {t("dashboard.purchases")}
        </span>
      ),
      children: <PurchasesTab />,
    },
    {
      key: "courses",
      label: (
        <span className="dashboard-tab-label">
          <BookOpen size={16} />
          {t("dashboard.courses")}
        </span>
      ),
      children: <CoursesTab />,
    },
    {
      key: "workshops",
      label: (
        <span className="dashboard-tab-label">
          <MapPin size={16} />
          {t("dashboard.workshops")}
        </span>
      ),
      children: <WorkshopsTab />,
    },
    {
      key: "profile",
      label: (
        <span className="dashboard-tab-label">
          <Settings size={16} />
          {t("dashboard.profile")}
        </span>
      ),
      children: <ProfileTab user={user} />,
    },
  ];

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <h1>{t("dashboard.title")}</h1>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="dashboard-root">
          <div className="dashboard-profile">
            <div className="dashboard-avatar">
              <User size={32} strokeWidth={1.5} />
            </div>
            <div className="dashboard-profile-info">
              <h3>{user.displayName}</h3>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="dashboard-tabs">
            <Tabs items={tabItems} defaultActiveKey="overview" />
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
