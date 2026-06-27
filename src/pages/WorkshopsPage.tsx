import "../styles/pages.css";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, Users, Clock, Share2, Filter, X } from "lucide-react";
import { Button } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { useWorkshopRegistration } from "../hooks/useWorkshopRegistration";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DataState } from "../components/shared/DataState";
import { WorkshopCountdown } from "../components/WorkshopCountdown";
import { CapacityBar } from "../components/CapacityBar";
import { getTitle, getDesc } from "../lib/i18n-helpers";
import type { Workshop } from "../types/content";

export function WorkshopsPage() {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items: workshops, loading, error, retry, empty } = useApiList<Workshop>("/api/workshops", "workshops");
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useSEO({ titleKey: "seo.workshopsTitle", descKey: "seo.workshopsDesc", path: "/workshops" });
  useGsapPageEffects(rootRef);

  const activeWorkshop = workshops.find((w) => w.id === formOpen);
  const registration = useWorkshopRegistration(activeWorkshop ?? null);

  const filteredWorkshops = workshops.filter((ws) => {
    if (statusFilter === "upcoming") {
      return new Date(ws.event_date) >= new Date();
    }
    if (statusFilter === "past") {
      return new Date(ws.event_date) < new Date();
    }
    if (statusFilter === "full") {
      const spotsLeft = (ws.max_participants || 0) - ws.current_participants;
      return spotsLeft <= 0;
    }
    if (statusFilter === "available") {
      const spotsLeft = (ws.max_participants || 0) - ws.current_participants;
      return spotsLeft > 0;
    }
    return true;
  });

  // Group workshops by month for calendar view
  const calendarMonths = filteredWorkshops.reduce<Record<string, Workshop[]>>((acc, ws) => {
    const date = new Date(ws.event_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(ws);
    return acc;
  }, {});

  const handleRegister = async (workshopId: string) => {
    setRegisteringId(workshopId);
    const result = await registration.register(workshopId);
    setRegisteringId(null);

    if (result && !result.requiresPayment) {
      setTimeout(() => { setFormOpen(null); registration.resetForm(); }, 2000);
    }
  };

  return (
    <PageTransition ref={rootRef}>
      <PageHero
        eyebrow="Workshops"
        title={t("workshops.title")}
        subtitle={t("workshops.intro")}
      />

      <section className="section-shell is-visible">
        <ErrorBoundary>

        {/* View mode and status filter controls */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, background: "var(--paper-white, #fffdf7)", padding: 4, borderRadius: 8, border: "1px solid var(--warm-border, rgba(139,94,74,0.12))" }}>
            <Button type={viewMode === "grid" ? "primary" : "text"} size="small" onClick={() => setViewMode("grid")}>
              <MapPin size={14} /> {t("workshops.gridView", "Grid")}
            </Button>
            <Button type={viewMode === "calendar" ? "primary" : "text"} size="small" onClick={() => setViewMode("calendar")}>
              <Calendar size={14} /> {t("workshops.calendarView", "Calendar")}
            </Button>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--warm-border, rgba(139,94,74,0.12))", background: "var(--paper-white, #fffdf7)", fontSize: 13 }}>
            <option value="all">{t("workshops.filterAll", "All")}</option>
            <option value="upcoming">{t("workshops.filterUpcoming", "Upcoming")}</option>
            <option value="past">{t("workshops.filterPast", "Past")}</option>
            <option value="available">{t("workshops.filterAvailable", "Available")}</option>
            <option value="full">{t("workshops.filterFull", "Full")}</option>
          </select>
          <button
            type="button"
            className="workshop-filter-mobile-btn"
            onClick={() => setFilterSheetOpen(true)}
            aria-label={t("workshops.filterSheetTitle", "Filter workshops")}
          >
            <Filter size={14} />
            <span>{t("workshops.filter", "Filter")}</span>
            {statusFilter !== "all" && <span className="workshop-filter-mobile-badge">1</span>}
          </button>
        </div>
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<MapPin size={40} strokeWidth={1.2} />}
          emptyText={t("workshops.empty")}
        >
          <div className="workshops-grid">
            {workshops.map((ws) => {
              const spotsLeft = (ws.max_participants || 0) - ws.current_participants;
              const isFull = spotsLeft <= 0;
              return (
                <div key={ws.id} className="workshop-card">
                  {ws.cover_image_url ? (
                    <div className="workshop-cover-wrap">
                      <img src={ws.cover_image_url} alt={getTitle(ws, i18n.language)} className="workshop-cover" loading="lazy" />
                      <span className={`workshop-cover-badge ${isFull ? "is-full" : ""}`}>
                        {isFull ? t("workshops.full") : `${spotsLeft} ${t("workshops.spotsLeft")}`}
                      </span>
                    </div>
                  ) : (
                    <div className="workshop-cover-placeholder">
                      <MapPin size={32} />
                    </div>
                  )}
                  <div className="workshop-info">
                    <h3>{getTitle(ws, i18n.language)}</h3>
                    <p>{getDesc(ws, i18n.language)}</p>
                    <WorkshopCountdown eventDate={ws.event_date} eventTime={ws.event_time} />
                    {ws.max_participants != null && ws.max_participants > 0 && (
                      <CapacityBar current={ws.current_participants} max={ws.max_participants} />
                    )}
                    <div className="workshop-meta">
                      <span><Calendar size={14} /> {ws.event_date} {ws.event_time}</span>
                      {ws.location && <span><MapPin size={14} /> {ws.location}</span>}
                      <span><Users size={14} /> {isFull ? t("workshops.full") : `${t("workshops.spotsLeft")}: ${spotsLeft}`}</span>
                    </div>
                    {ws.price_display && <div className="workshop-price">{ws.price_display}</div>}
                    <div className="workshop-actions-row">
                      <button
                        type="button"
                        className="workshop-share-btn"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/workshops/${ws.id}`;
                          try {
                            if (navigator.share) {
                              await navigator.share({ title: getTitle(ws, i18n.language), url });
                            } else {
                              await navigator.clipboard.writeText(url);
                            }
                          } catch { /* cancelled */ }
                        }}
                        aria-label={t("gallery.share")}
                      >
                        <Share2 size={14} />
                      </button>
                      {formOpen === ws.id ? (
                      <div className="workshop-register-form">
                        <label htmlFor={`workshop-name-${ws.id}`} className="sr-only">
                          {t("workshops.form.name")}
                        </label>
                        <input
                          id={`workshop-name-${ws.id}`}
                          value={registration.formName}
                          onChange={(e) => registration.setFormName(e.target.value)}
                          placeholder={t("workshops.form.name")}
                          aria-label={t("workshops.form.name")}
                        />
                        <label htmlFor={`workshop-contact-${ws.id}`} className="sr-only">
                          {t("workshops.form.contact")}
                        </label>
                        <input
                          id={`workshop-contact-${ws.id}`}
                          value={registration.formContact}
                          onChange={(e) => registration.setFormContact(e.target.value)}
                          placeholder={t("workshops.form.contact")}
                          aria-label={t("workshops.form.contact")}
                        />
                        {registration.formMsg && (
                          <p className={registration.formMsg === t("workshops.form.success") ? "dashboard-form-message dashboard-form-message--success" : "dashboard-form-message dashboard-form-message--error"}>
                            {registration.formMsg}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Button type="primary" onClick={() => handleRegister(ws.id)} disabled={registeringId === ws.id}>
                            {registeringId === ws.id ? t("workshops.form.submitting") : t("workshops.form.submit")}
                          </Button>
                          <Button type="text" onClick={() => { setFormOpen(null); registration.resetForm(); }}>
                            {t("workshops.form.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="workshop-actions">
                        <Button
                          type="primary"
                          disabled={isFull}
                          onClick={() => { setFormOpen(ws.id); registration.resetForm(); }}
                        >
                          {t("workshops.register")}
                        </Button>
                        <Link
                          to={`/workshops/${ws.id}`}
                          style={{ fontSize: "0.85rem", color: "var(--accent)", textDecoration: "none" }}
                        >
                          {t("workshops.viewDetail")}
                        </Link>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataState>
        </ErrorBoundary>
      </section>
      {filterSheetOpen && (
        <div className="workshop-filter-overlay" onClick={() => setFilterSheetOpen(false)}>
          <div className="workshop-filter-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="workshop-filter-sheet-header">
              <h3>{t("workshops.filterSheetTitle", "Filter workshops")}</h3>
              <button type="button" onClick={() => setFilterSheetOpen(false)} aria-label={t("common.close", "Close")}>
                <X size={18} />
              </button>
            </div>
            <div className="workshop-filter-sheet-body">
              <label className="workshop-filter-sheet-label">
                <span>{t("workshops.filterStatusLabel", "Status")}</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">{t("workshops.statusAll", "All")}</option>
                  <option value="upcoming">{t("workshops.statusUpcoming", "Upcoming")}</option>
                  <option value="available">{t("workshops.statusAvailable", "Available")}</option>
                  <option value="full">{t("workshops.statusFull", "Full")}</option>
                  <option value="past">{t("workshops.statusPast", "Past")}</option>
                </select>
              </label>
            </div>
            <div className="workshop-filter-sheet-actions">
              <Button type="default" onClick={() => { setStatusFilter("all"); setFilterSheetOpen(false); }}>
                {t("workshops.filterReset", "Reset")}
              </Button>
              <Button type="primary" onClick={() => setFilterSheetOpen(false)}>
                {t("workshops.filterApply", "Apply")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
