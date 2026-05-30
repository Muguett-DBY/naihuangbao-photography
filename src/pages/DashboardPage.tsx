import { useRef, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, Button } from "animal-island-ui";
import { User, CalendarCheck, ShoppingCart, BookOpen, MapPin, Image, Download, Settings, X, RefreshCw } from "lucide-react";
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

type UserPhoto = {
  id: string;
  title: string;
  imageUrl: string;
  style: string;
  delivered_at: string;
};

type UserProfile = {
  displayName: string;
  email: string;
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
  const { data, loading, retry } = useFetch<{ bookings: Booking[] }>("/api/user/bookings");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancel = useCallback(async (bookingId: string) => {
    setCancelLoading(true);
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        setConfirmCancelId(null);
        retry();
      }
    } finally {
      setCancelLoading(false);
    }
  }, [retry]);

  const handleReschedule = useCallback(async (bookingId: string) => {
    if (!newDate) return;
    setRescheduleLoading(true);
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ preferred_date: newDate }),
      });
      if (response.ok) {
        setRescheduleId(null);
        setNewDate("");
        retry();
      }
    } finally {
      setRescheduleLoading(false);
    }
  }, [newDate, retry]);

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
      {bookings.map((b) => {
        const canManage = b.status === "pending" || b.status === "confirmed";
        return (
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
            {canManage && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setConfirmCancelId(b.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid #e74c3c",
                    borderRadius: 6,
                    color: "#e74c3c",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  <X size={12} />
                  {t("dashboard.cancelBooking")}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleId(rescheduleId === b.id ? null : b.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid var(--accent)",
                    borderRadius: 6,
                    color: "var(--accent)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={12} />
                  {t("dashboard.rescheduleBooking")}
                </button>
              </div>
            )}
            {confirmCancelId === b.id && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: "rgba(231, 76, 60, 0.1)",
                borderRadius: 8,
                border: "1px solid rgba(231, 76, 60, 0.2)",
              }}>
                <p style={{ margin: 0, fontSize: "0.85rem", marginBottom: 8 }}>
                  {t("dashboard.confirmCancel")}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    type="primary"
                    onClick={() => handleCancel(b.id)}
                    disabled={cancelLoading}
                    style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                  >
                    {cancelLoading ? t("common.loading") : t("dashboard.yesCancel")}
                  </Button>
                  <Button
                    type="default"
                    onClick={() => setConfirmCancelId(null)}
                    style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                  >
                    {t("dashboard.noKeep")}
                  </Button>
                </div>
              </div>
            )}
            {rescheduleId === b.id && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: "var(--card-bg, rgba(255,255,255,0.7))",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
              }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 6 }}>
                  {t("dashboard.selectNewDate")}
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    marginRight: 8,
                  }}
                />
                <Button
                  type="primary"
                  onClick={() => handleReschedule(b.id)}
                  disabled={!newDate || rescheduleLoading}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  {rescheduleLoading ? t("common.loading") : t("dashboard.confirmReschedule")}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MyPhotosTab() {
  const { t } = useTranslation();
  const { data, loading } = useFetch<{ photos: UserPhoto[] }>("/api/user/photos");

  if (loading) return <div className="dashboard-loading">{t("common.loading")}</div>;

  const photos = data?.photos ?? [];

  if (photos.length === 0) {
    return (
      <div className="dashboard-empty">
        <Image size={40} strokeWidth={1.2} />
        <p>{t("dashboard.noPhotos")}</p>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 16,
    }}>
      {photos.map((photo) => (
        <div
          key={photo.id}
          style={{
            borderRadius: 12,
            overflow: "hidden",
            background: "var(--card-bg, rgba(255,255,255,0.7))",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Link to={`/gallery/${photo.id}`} style={{ textDecoration: "none" }}>
            <div style={{ aspectRatio: "1", overflow: "hidden" }}>
              <img
                src={photo.imageUrl}
                alt={photo.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
              />
            </div>
            <div style={{ padding: "10px 12px" }}>
              <h4 style={{ margin: 0, fontSize: "0.85rem" }}>{photo.title}</h4>
              <span style={{ fontSize: "0.75rem", color: "var(--caramel-muted)" }}>
                {photo.delivered_at ? new Date(photo.delivered_at).toLocaleDateString() : ""}
              </span>
            </div>
          </Link>
          <div style={{ padding: "0 12px 10px" }}>
            <a
              href={photo.imageUrl}
              download
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 6,
                fontSize: "0.75rem",
                textDecoration: "none",
              }}
            >
              <Download size={12} />
              {t("dashboard.download")}
            </a>
          </div>
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

function ProfileTab({ user }: { user: { displayName: string; email: string } }) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName }),
      });
      if (response.ok) {
        setProfileMessage({ type: "success", text: t("dashboard.profileSaved") });
      } else {
        const data = await response.json();
        setProfileMessage({ type: "error", text: data.error || t("dashboard.profileError") });
      }
    } catch {
      setProfileMessage({ type: "error", text: t("dashboard.profileError") });
    } finally {
      setProfileLoading(false);
    }
  }, [displayName, t]);

  const handleChangePassword = useCallback(async () => {
    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (response.ok) {
        setPasswordMessage({ type: "success", text: t("dashboard.passwordChanged") });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await response.json();
        setPasswordMessage({ type: "error", text: data.error || t("dashboard.passwordError") });
      }
    } catch {
      setPasswordMessage({ type: "error", text: t("dashboard.passwordError") });
    } finally {
      setPasswordLoading(false);
    }
  }, [currentPassword, newPassword, t]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h3 style={{ marginBottom: 16 }}>{t("dashboard.editProfile")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          <label style={{ fontSize: "0.85rem", color: "var(--caramel-muted)" }}>
            {t("dashboard.displayName")}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              fontSize: "0.9rem",
            }}
          />
          {profileMessage && (
            <p style={{
              margin: 0,
              fontSize: "0.85rem",
              color: profileMessage.type === "success" ? "#27ae60" : "#e74c3c",
            }}>
              {profileMessage.text}
            </p>
          )}
          <Button
            type="primary"
            onClick={handleSaveProfile}
            disabled={profileLoading || !displayName.trim()}
            style={{ alignSelf: "flex-start" }}
          >
            {profileLoading ? t("common.loading") : t("dashboard.saveProfile")}
          </Button>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 32 }}>
        <h3 style={{ marginBottom: 16 }}>{t("dashboard.changePassword")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          <label style={{ fontSize: "0.85rem", color: "var(--caramel-muted)" }}>
            {t("dashboard.currentPassword")}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              fontSize: "0.9rem",
            }}
          />
          <label style={{ fontSize: "0.85rem", color: "var(--caramel-muted)" }}>
            {t("dashboard.newPassword")}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              fontSize: "0.9rem",
            }}
          />
          {passwordMessage && (
            <p style={{
              margin: 0,
              fontSize: "0.85rem",
              color: passwordMessage.type === "success" ? "#27ae60" : "#e74c3c",
            }}>
              {passwordMessage.text}
            </p>
          )}
          <Button
            type="primary"
            onClick={handleChangePassword}
            disabled={passwordLoading || !currentPassword || !newPassword}
            style={{ alignSelf: "flex-start" }}
          >
            {passwordLoading ? t("common.loading") : t("dashboard.updatePassword")}
          </Button>
        </div>
      </div>
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
      key: "photos",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Image size={16} />
          {t("dashboard.myPhotos")}
        </span>
      ),
      children: <MyPhotosTab />,
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
    {
      key: "profile",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
            <Tabs items={tabItems} defaultActiveKey="bookings" />
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
