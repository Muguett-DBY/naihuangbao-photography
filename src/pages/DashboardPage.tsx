import { useRef, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, Button } from "animal-island-ui";
import { User, CalendarCheck, ShoppingCart, BookOpen, MapPin, Image, Download, Settings, X, RefreshCw, AlertCircle } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { PageTransition } from "../components/shared/PageTransition";
import { DashboardTabWrapper } from "../components/dashboard/DashboardTabWrapper";
import { tWorkshopStatus, tCourseDifficulty } from "../lib/i18n-typed";
import { publicMutationHeaders } from "../lib/admin-helpers";
import type { Booking, Purchase, Course, Workshop, UserPhoto } from "../types/dashboard";

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={`dashboard-status dashboard-status--${status}`}>
      {tWorkshopStatus(t, status) || status}
    </span>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="dashboard-error">
      <AlertCircle size={32} className="dashboard-error-icon" />
      <p>{message}</p>
      <button type="button" className="dashboard-error-retry" onClick={onRetry}>
        <RefreshCw size={14} />
        {t("common.retry", "重试")}
      </button>
    </div>
  );
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function BookingsTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ bookings: Booking[] }>("/api/user/bookings");
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
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
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
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
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
  if (error) return <ErrorState message={t("common.loadError", "加载失败，请重试")} onRetry={retry} />;

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
              <div className="dashboard-actions">
                <button
                  type="button"
                  className="dashboard-action-btn dashboard-action-btn--cancel"
                  onClick={() => setConfirmCancelId(b.id)}
                >
                  <X size={12} />
                  {t("dashboard.cancelBooking")}
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn dashboard-action-btn--reschedule"
                  onClick={() => setRescheduleId(rescheduleId === b.id ? null : b.id)}
                >
                  <RefreshCw size={12} />
                  {t("dashboard.rescheduleBooking")}
                </button>
              </div>
            )}
            {confirmCancelId === b.id && (
              <div className="dashboard-confirm-panel dashboard-confirm-panel--danger">
                <p className="dashboard-confirm-text">
                  {t("dashboard.confirmCancel")}
                </p>
                <div className="dashboard-confirm-actions">
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
              <div className="dashboard-confirm-panel dashboard-confirm-panel--default">
                <label className="dashboard-reschedule-label">
                  {t("dashboard.selectNewDate")}
                </label>
                <input
                  type="date"
                  value={newDate}
                  min={getTodayString()}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="dashboard-reschedule-date"
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
  const { data, loading, error, retry } = useFetch<{ photos: UserPhoto[] }>("/api/user/photos");

  const photos = data?.photos ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={photos.length === 0}
      emptyIcon={<Image size={40} strokeWidth={1.2} />}
      emptyText={t("dashboard.noPhotos")}
      retry={retry}
    >
      <div className="dashboard-photo-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="dashboard-photo-card">
            <Link to={`/gallery/${photo.id}`} className="dashboard-photo-link">
              <div className="dashboard-photo-thumb">
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  loading="lazy"
                />
              </div>
              <div className="dashboard-photo-info">
                <h4>{photo.title}</h4>
                <span className="dashboard-photo-date">
                  {photo.delivered_at ? new Date(photo.delivered_at).toLocaleDateString() : ""}
                </span>
              </div>
            </Link>
            <div className="dashboard-photo-actions">
              <a
                href={photo.imageUrl}
                download
                className="dashboard-photo-download"
              >
                <Download size={12} />
                {t("dashboard.download")}
              </a>
            </div>
          </div>
        ))}
      </div>
    </DashboardTabWrapper>
  );
}

function PurchasesTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ purchases: Purchase[] }>("/api/user/purchases");

  const purchases = data?.purchases ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={purchases.length === 0}
      emptyIcon={<ShoppingCart size={40} strokeWidth={1.2} />}
      emptyText={t("dashboard.noPurchases")}
      retry={retry}
    >
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
    </DashboardTabWrapper>
  );
}

function CoursesTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ courses: Course[] }>("/api/user/courses");

  const courses = data?.courses ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={courses.length === 0}
      emptyIcon={<BookOpen size={40} strokeWidth={1.2} />}
      emptyText={t("dashboard.noCourses")}
      retry={retry}
    >
      <div className="dashboard-list">
        {courses.map((c) => (
          <div key={c.id} className="dashboard-card">
            <div className="dashboard-card-header">
              <h4>{c.title}</h4>
              <span className="dashboard-card-type">{tCourseDifficulty(t, c.difficulty)}</span>
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
    </DashboardTabWrapper>
  );
}

function WorkshopsTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ workshops: Workshop[] }>("/api/user/workshops");

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
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={workshops.length === 0}
      emptyIcon={<MapPin size={40} strokeWidth={1.2} />}
      emptyText={t("dashboard.noWorkshops")}
      retry={retry}
    >
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
    </DashboardTabWrapper>
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
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
        body: JSON.stringify({ displayName }),
      });
      if (response.ok) {
        setProfileMessage({ type: "success", text: t("dashboard.profileSaved") });
      } else {
        const data = await response.json();
        setProfileMessage({ type: "error", text: data.error || t("dashboard.profileError") });
      }
    } catch (e) {
      console.error("[Dashboard] profile update failed", e);
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
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
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
    } catch (e) {
      console.error("[Dashboard] password change failed", e);
      setPasswordMessage({ type: "error", text: t("dashboard.passwordError") });
    } finally {
      setPasswordLoading(false);
    }
  }, [currentPassword, newPassword, t]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h3 style={{ marginBottom: 16 }}>{t("dashboard.editProfile")}</h3>
        <div className="dashboard-form-group">
          <label htmlFor="dashboard-display-name" className="dashboard-form-label">
            {t("dashboard.displayName")}
          </label>
          <input
            id="dashboard-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="dashboard-form-input"
          />
          {profileMessage && (
            <p className={`dashboard-form-message dashboard-form-message--${profileMessage.type}`}>
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

      <div className="dashboard-section-divider">
        <h3 style={{ marginBottom: 16 }}>{t("dashboard.changePassword")}</h3>
        <div className="dashboard-form-group">
          <label htmlFor="dashboard-current-password" className="dashboard-form-label">
            {t("dashboard.currentPassword")}
          </label>
          <input
            id="dashboard-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="dashboard-form-input"
          />
          <label htmlFor="dashboard-new-password" className="dashboard-form-label">
            {t("dashboard.newPassword")}
          </label>
          <input
            id="dashboard-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="dashboard-form-input"
          />
          {passwordMessage && (
            <p className={`dashboard-form-message dashboard-form-message--${passwordMessage.type}`}>
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
            <Tabs items={tabItems} defaultActiveKey="bookings" />
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
