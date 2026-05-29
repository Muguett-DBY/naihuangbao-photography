import { useRef } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs } from "animal-island-ui";
import { User, CalendarCheck, ShoppingCart, BookOpen, MapPin } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { PageTransition } from "../components/shared/PageTransition";

type Booking = {
  id: string;
  package_name: string;
  preferred_date: string;
  preferred_time: string;
  name: string;
  status: string;
  created_at: string;
};

type Purchase = {
  id: string;
  item_type: string;
  item_name: string;
  price_cents: number;
  created_at: string;
};

type Course = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  cover_image_url: string | null;
  progress: number;
  purchased_at: string;
};

type Workshop = {
  id: string;
  workshop_id: string;
  title: string;
  event_date: string;
  location: string;
  participants: number;
  status: string;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={`dashboard-status dashboard-status--${status}`}>
      {t(`dashboard.status.${status}` as any) || status}
    </span>
  );
}

function BookingsTab() {
  const { t } = useTranslation();
  const { data, loading } = useFetch<{ bookings: Booking[] }>("/api/user/bookings");

  if (loading) return <div className="dashboard-loading">{t("common.loading")}</div>;

  const bookings = data?.bookings ?? [];

  if (bookings.length === 0) {
    return (
      <div className="dashboard-empty">
        <CalendarCheck size={40} strokeWidth={1.2} />
        <p>{t("dashboard.noBookings")}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-list">
      {bookings.map((b) => (
        <div key={b.id} className="dashboard-card">
          <div className="dashboard-card-header">
            <h4>{b.package_name}</h4>
            <StatusBadge status={b.status} />
          </div>
          <div className="dashboard-card-meta">
            {b.preferred_date && <span>{b.preferred_date}</span>}
            {b.preferred_time && <span>{b.preferred_time}</span>}
          </div>
          <p className="dashboard-card-date">
            {new Date(b.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function PurchasesTab() {
  const { t } = useTranslation();
  const { data, loading } = useFetch<{ purchases: Purchase[] }>("/api/user/purchases");

  if (loading) return <div className="dashboard-loading">{t("common.loading")}</div>;

  const purchases = data?.purchases ?? [];

  if (purchases.length === 0) {
    return (
      <div className="dashboard-empty">
        <ShoppingCart size={40} strokeWidth={1.2} />
        <p>{t("dashboard.noPurchases")}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-list">
      {purchases.map((p) => (
        <div key={p.id} className="dashboard-card">
          <div className="dashboard-card-header">
            <h4>{p.item_name}</h4>
            <span className="dashboard-card-type">{p.item_type}</span>
          </div>
          <p className="dashboard-card-date">
            {new Date(p.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function CoursesTab() {
  const { t } = useTranslation();
  const { data, loading } = useFetch<{ courses: Course[] }>("/api/user/courses");

  if (loading) return <div className="dashboard-loading">{t("common.loading")}</div>;

  const courses = data?.courses ?? [];

  if (courses.length === 0) {
    return (
      <div className="dashboard-empty">
        <BookOpen size={40} strokeWidth={1.2} />
        <p>{t("dashboard.noCourses")}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-list">
      {courses.map((c) => (
        <div key={c.id} className="dashboard-card">
          <div className="dashboard-card-header">
            <h4>{c.title}</h4>
            <span className="dashboard-card-type">{t(`courses.difficulty.${c.difficulty}` as any)}</span>
          </div>
          <div className="dashboard-progress">
            <div className="dashboard-progress-bar">
              <div className="dashboard-progress-fill" style={{ width: `${c.progress ?? 0}%` }} />
            </div>
            <span className="dashboard-progress-text">{c.progress ?? 0}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkshopsTab() {
  const { t } = useTranslation();
  const { data, loading } = useFetch<{ workshops: Workshop[] }>("/api/user/workshops");

  if (loading) return <div className="dashboard-loading">{t("common.loading")}</div>;

  const workshops = data?.workshops ?? [];

  if (workshops.length === 0) {
    return (
      <div className="dashboard-empty">
        <MapPin size={40} strokeWidth={1.2} />
        <p>{t("dashboard.noWorkshops")}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-list">
      {workshops.map((w) => (
        <div key={w.id} className="dashboard-card">
          <div className="dashboard-card-header">
            <h4>{w.title}</h4>
            <StatusBadge status={w.status} />
          </div>
          <div className="dashboard-card-meta">
            {w.event_date && <span>{w.event_date}</span>}
            {w.location && <span>{w.location}</span>}
          </div>
          <p className="dashboard-card-date">
            {new Date(w.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

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
      key: "bookings",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarCheck size={16} />
          {t("dashboard.bookings")}
        </span>
      ),
      children: <BookingsTab />,
    },
    {
      key: "purchases",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShoppingCart size={16} />
          {t("dashboard.purchases")}
        </span>
      ),
      children: <PurchasesTab />,
    },
    {
      key: "courses",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BookOpen size={16} />
          {t("dashboard.courses")}
        </span>
      ),
      children: <CoursesTab />,
    },
    {
      key: "workshops",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MapPin size={16} />
          {t("dashboard.workshops")}
        </span>
      ),
      children: <WorkshopsTab />,
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
            <Tabs items={tabItems} defaultActiveKey="bookings" />
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
