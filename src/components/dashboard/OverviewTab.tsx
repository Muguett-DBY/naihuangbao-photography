import { useTranslation } from "react-i18next";
import { CalendarCheck, BookOpen, MapPin, ArrowRight, Camera, Sparkles, ShoppingBag, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../hooks/useAuth";
import { Skeleton } from "../shared/Skeleton";
import { StatusBadge } from "./StatusBadge";

type UserStats = {
  bookings: { total: number; upcoming: number };
  courses: { total: number };
  workshops: { total: number };
};

type BookingItem = {
  id: string;
  package_name: string;
  preferred_date: string;
  status: string;
  created_at: string;
};

export function OverviewTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading } = useFetch<UserStats>("/api/user/stats");
  const { data: bookingsData } = useFetch<{ bookings: BookingItem[] }>("/api/user/bookings?limit=3");

  const recentBookings = bookingsData?.bookings ?? [];

  if (loading) {
    return (
      <div className="overview-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overview-card">
            <Skeleton type="card" height={120} />
          </div>
        ))}
      </div>
    );
  }

  const stats = data ?? {
    bookings: { total: 0, upcoming: 0 },
    courses: { total: 0 },
    workshops: { total: 0 },
  };

  const userName = user?.displayName || user?.email?.split("@")[0] || "";

  const cards = [
    {
      key: "bookings",
      icon: <CalendarCheck size={22} aria-hidden="true" />,
      label: t("dashboard.bookings"),
      value: stats.bookings.total,
      sub: stats.bookings.upcoming > 0
        ? `${stats.bookings.upcoming} ${t("dashboard.upcoming")}`
        : undefined,
      link: "/booking",
    },
    {
      key: "courses",
      icon: <BookOpen size={22} aria-hidden="true" />,
      label: t("dashboard.courses"),
      value: stats.courses.total,
      link: "/courses",
    },
    {
      key: "workshops",
      icon: <MapPin size={22} aria-hidden="true" />,
      label: t("dashboard.workshops"),
      value: stats.workshops.total,
      link: "/workshops",
    },
  ];

  const quickActions = [
    { icon: <Camera size={18} />, label: t("dashboard.quickGallery", "Browse Gallery"), link: "/gallery" },
    { icon: <Sparkles size={18} />, label: t("dashboard.quickEditor", "Open Editor"), link: "/editor" },
    { icon: <ShoppingBag size={18} />, label: t("dashboard.quickShop", "Visit Shop"), link: "/shop" },
  ];
  const isFirstVisit = stats.bookings.total === 0
    && stats.courses.total === 0
    && stats.workshops.total === 0
    && recentBookings.length === 0;
  const startActions = [
    {
      icon: <CalendarCheck size={18} />,
      title: t("dashboard.startHere.book.title"),
      description: t("dashboard.startHere.book.description"),
      link: "/booking",
    },
    {
      icon: <Camera size={18} />,
      title: t("dashboard.startHere.gallery.title"),
      description: t("dashboard.startHere.gallery.description"),
      link: "/gallery",
    },
    {
      icon: <Sparkles size={18} />,
      title: t("dashboard.startHere.editor.title"),
      description: t("dashboard.startHere.editor.description"),
      link: "/editor",
    },
  ];

  return (
    <div className="overview-tab">
      {userName && (
        <div className="overview-welcome">
          <h2>{t("dashboard.welcomeBack", { name: userName, defaultValue: `Welcome back, ${userName}` })}</h2>
          <p>{t("dashboard.welcomeDesc", "Here's what's happening with your account.")}</p>
        </div>
      )}

      {isFirstVisit && (
        <section className="overview-start-panel" aria-labelledby="overview-start-title">
          <div className="overview-start-heading">
            <span>{t("dashboard.startHere.eyebrow")}</span>
            <h3 id="overview-start-title">{t("dashboard.startHere.title")}</h3>
            <p>{t("dashboard.startHere.description")}</p>
          </div>
          <div className="overview-start-grid">
            {startActions.map((action) => (
              <Link key={action.link} to={action.link} className="overview-start-action">
                <span className="overview-start-icon" aria-hidden="true">{action.icon}</span>
                <span className="overview-start-copy">
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="overview-grid">
        {cards.map((card) => (
          <article key={card.key} className={`overview-card overview-card--${card.key}`}>
            <div className="overview-card-icon">
              {card.icon}
            </div>
            <div className="overview-card-body">
              <span className="overview-card-label">{card.label}</span>
              <span className="overview-card-value">{card.value}</span>
              {card.sub && <span className="overview-card-sub">{card.sub}</span>}
            </div>
            {card.link && (
              <Link to={card.link} className="overview-card-link" aria-label={card.label}>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </article>
        ))}
      </div>

      <div className="overview-quick-actions">
        <h3>{t("dashboard.quickActions", "Quick Actions")}</h3>
        <div className="overview-quick-grid">
          {quickActions.map((action) => (
            <Link key={action.link} to={action.link} className="overview-quick-btn">
              <span aria-hidden="true">{action.icon}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {recentBookings.length > 0 && (
        <div className="overview-recent-section">
          <h3><Clock size={16} /> {t("dashboard.recentBookings", "Recent Bookings")}</h3>
          <div className="overview-recent-list">
            {recentBookings.map((b) => (
              <div key={b.id} className="overview-recent-item">
                <div className="overview-recent-info">
                  <span className="overview-recent-package">{b.package_name}</span>
                  <span className="overview-recent-date">
                    {b.preferred_date ? new Date(b.preferred_date).toLocaleDateString() : t("bookingModal.any", "Any")}
                  </span>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
