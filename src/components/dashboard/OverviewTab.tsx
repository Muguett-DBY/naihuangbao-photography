import { useTranslation } from "react-i18next";
import { CalendarCheck, BookOpen, MapPin, ArrowRight, Camera, Sparkles, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../hooks/useAuth";
import { Skeleton } from "../shared/Skeleton";

type UserStats = {
  bookings: { total: number; upcoming: number };
  courses: { total: number };
  workshops: { total: number };
};

export function OverviewTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading } = useFetch<UserStats>("/api/user/stats");

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
      icon: <CalendarCheck size={28} />,
      label: t("dashboard.bookings"),
      value: stats.bookings.total,
      sub: stats.bookings.upcoming > 0
        ? `${stats.bookings.upcoming} ${t("dashboard.upcoming")}`
        : undefined,
      color: "#eab308",
      link: "",
    },
    {
      icon: <BookOpen size={28} />,
      label: t("dashboard.courses"),
      value: stats.courses.total,
      color: "#3b82f6",
      link: "/courses",
    },
    {
      icon: <MapPin size={28} />,
      label: t("dashboard.workshops"),
      value: stats.workshops.total,
      color: "#a855f7",
      link: "/workshops",
    },
  ];

  const quickActions = [
    { icon: <Camera size={18} />, label: t("dashboard.quickGallery", "Browse Gallery"), link: "/gallery" },
    { icon: <Sparkles size={18} />, label: t("dashboard.quickEditor", "Open Editor"), link: "/editor" },
    { icon: <ShoppingBag size={18} />, label: t("dashboard.quickShop", "Visit Shop"), link: "/shop" },
  ];

  return (
    <div className="overview-tab">
      {userName && (
        <div className="overview-welcome">
          <h2>{t("dashboard.welcomeBack", { name: userName, defaultValue: `Welcome back, ${userName}` })}</h2>
          <p>{t("dashboard.welcomeDesc", "Here's what's happening with your account.")}</p>
        </div>
      )}

      <div className="overview-grid">
        {cards.map((card, i) => (
          <div key={i} className="overview-card">
            <div className="overview-card-icon" style={{ background: `${card.color}18`, color: card.color }}>
              {card.icon}
            </div>
            <div className="overview-card-body">
              <span className="overview-card-label">{card.label}</span>
              <span className="overview-card-value">{card.value}</span>
              {card.sub && <span className="overview-card-sub">{card.sub}</span>}
            </div>
            {card.link && (
              <Link to={card.link} className="overview-card-link" aria-label={card.label}>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="overview-quick-actions">
        <h3>{t("dashboard.quickActions", "Quick Actions")}</h3>
        <div className="overview-quick-grid">
          {quickActions.map((action, i) => (
            <Link key={i} to={action.link} className="overview-quick-btn">
              {action.icon}
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
