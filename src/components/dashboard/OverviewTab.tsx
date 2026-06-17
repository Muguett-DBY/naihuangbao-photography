import { useTranslation } from "react-i18next";
import { CalendarCheck, BookOpen, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { Skeleton } from "../shared/Skeleton";

type UserStats = {
  bookings: { total: number; upcoming: number };
  courses: { total: number };
  workshops: { total: number };
};

export function OverviewTab() {
  const { t } = useTranslation();
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

  return (
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
  );
}
