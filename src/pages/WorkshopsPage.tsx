import "../styles/pages.css";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Calendar, Clock, Filter, LayoutGrid, MapPin, Share2, Users, X } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { getWorkshopAvailability, useWorkshopRegistration } from "../hooks/useWorkshopRegistration";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DataState } from "../components/shared/DataState";
import { WorkshopCountdown } from "../components/WorkshopCountdown";
import { CapacityBar } from "../components/CapacityBar";
import { getTitle, getDesc } from "../lib/i18n-helpers";
import { tWorkshopStatus } from "../lib/i18n-typed";
import type { Workshop } from "../types/content";

type ViewMode = "grid" | "calendar";

export function WorkshopsPage() {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items: workshops, loading, error, retry, empty } = useApiList<Workshop>("/api/workshops", "workshops");
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const filterSheetRef = useFocusTrap<HTMLDivElement>({ active: filterSheetOpen });

  useSEO({ titleKey: "seo.workshopsTitle", descKey: "seo.workshopsDesc", path: "/workshops" });
  useGsapPageEffects(rootRef);

  const activeWorkshop = workshops.find((workshop) => workshop.id === formOpen);
  const registration = useWorkshopRegistration(activeWorkshop ?? null);

  const filteredWorkshops = useMemo(() => workshops.filter((workshop) => {
    const availability = getWorkshopAvailability(workshop);
    if (statusFilter === "upcoming") return workshop.status === "upcoming";
    if (statusFilter === "ongoing") return workshop.status === "ongoing";
    if (statusFilter === "full") {
      return workshop.status === "upcoming" && availability.spotsLeft === 0;
    }
    if (statusFilter === "available") return availability.available;
    return true;
  }), [statusFilter, workshops]);

  const calendarMonths = useMemo(() => filteredWorkshops.reduce<Record<string, Workshop[]>>((groups, workshop) => {
    const date = new Date(workshop.event_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    (groups[key] ??= []).push(workshop);
    return groups;
  }, {}), [filteredWorkshops]);

  const handleRegister = async (workshopId: string) => {
    setRegisteringId(workshopId);
    const result = await registration.register(workshopId);
    setRegisteringId(null);

    if (result && !result.requiresPayment) {
      setTimeout(() => {
        setFormOpen(null);
        registration.resetForm();
      }, 2000);
    }
  };

  const shareWorkshop = async (workshop: Workshop) => {
    const url = `${window.location.origin}/workshops/${workshop.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: getTitle(workshop, i18n.language), url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Native share cancellation needs no UI error.
    }
  };

  const renderWorkshopCard = (workshop: Workshop, index: number) => {
    const availability = getWorkshopAvailability(workshop);
    const { spotsLeft } = availability;
    const isClosed = !availability.available;
    const title = getTitle(workshop, i18n.language);
    const capacityLabel = workshop.status !== "upcoming"
      ? tWorkshopStatus(t, workshop.status)
      : spotsLeft === null
        ? t("workshops.statusAvailable")
        : spotsLeft === 0
          ? t("workshops.full")
          : `${t("workshops.spotsLeft")}: ${spotsLeft}`;

    return (
      <article key={workshop.id} className="workshop-card catalogue-card">
        <span className="catalogue-card-index">{String(index + 1).padStart(2, "0")}</span>
        <Link to={`/workshops/${workshop.id}`} className="catalogue-card-link">
          {workshop.cover_image_url ? (
            <div className="workshop-cover-wrap catalogue-card-media">
              <img src={workshop.cover_image_url} alt={title} className="workshop-cover" loading="lazy" />
              <span className={`workshop-cover-badge${isClosed ? " is-full" : ""}`}>
                {capacityLabel}
              </span>
            </div>
          ) : (
            <div className="workshop-cover-placeholder catalogue-card-media">
              <MapPin size={32} aria-hidden="true" />
            </div>
          )}
          <div className="workshop-info catalogue-card-copy">
            <span className="course-category">{workshop.event_date}</span>
            <h3>{title}</h3>
            <p>{getDesc(workshop, i18n.language)}</p>
          </div>
        </Link>

        <div className="workshop-card-operations">
          <WorkshopCountdown eventDate={workshop.event_date} eventTime={workshop.event_time} />
          {workshop.max_participants != null && workshop.max_participants > 0 && (
            <CapacityBar current={workshop.current_participants} max={workshop.max_participants} />
          )}
          <div className="workshop-meta">
            <span><Calendar size={14} aria-hidden="true" /> {workshop.event_date} {workshop.event_time}</span>
            {workshop.location && <span><MapPin size={14} aria-hidden="true" /> {workshop.location}</span>}
            <span><Users size={14} aria-hidden="true" /> {capacityLabel}</span>
          </div>
          {workshop.price_display && <div className="workshop-price">{workshop.price_display}</div>}

          {formOpen === workshop.id ? (
            <div className="workshop-register-form">
              <label htmlFor={`workshop-name-${workshop.id}`}>{t("workshops.form.name")}</label>
              <input
                id={`workshop-name-${workshop.id}`}
                value={registration.formName}
                onChange={(event) => registration.setFormName(event.target.value)}
                autoComplete="name"
              />
              <label htmlFor={`workshop-contact-${workshop.id}`}>{t("workshops.form.contact")}</label>
              <input
                id={`workshop-contact-${workshop.id}`}
                value={registration.formContact}
                onChange={(event) => registration.setFormContact(event.target.value)}
                autoComplete="email"
              />
              {registration.formMsg && (
                <p className={registration.formMsg === t("workshops.form.success")
                  ? "dashboard-form-message dashboard-form-message--success"
                  : "dashboard-form-message dashboard-form-message--error"}
                >
                  {registration.formMsg}
                </p>
              )}
              <div className="workshop-register-actions">
                <button
                  type="button"
                  className="catalogue-primary-button"
                  onClick={() => handleRegister(workshop.id)}
                  disabled={registeringId === workshop.id}
                >
                  {registeringId === workshop.id ? t("workshops.form.submitting") : t("workshops.form.submit")}
                </button>
                <button
                  type="button"
                  className="catalogue-secondary-button"
                  onClick={() => {
                    setFormOpen(null);
                    registration.resetForm();
                  }}
                >
                  {t("workshops.form.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="workshop-actions-row">
              <button
                type="button"
                className="workshop-share-btn"
                onClick={() => shareWorkshop(workshop)}
                aria-label={t("gallery.share")}
              >
                <Share2 size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="catalogue-primary-button"
                disabled={isClosed}
                onClick={() => {
                  setFormOpen(workshop.id);
                  registration.resetForm();
                }}
              >
                {t("workshops.register")}
              </button>
              <Link to={`/workshops/${workshop.id}`} className="catalogue-detail-link">
                {t("workshops.viewDetail")} <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <PageTransition ref={rootRef} className="catalogue-page catalogue-page--workshops">
      <PageHero
        eyebrow="Workshops"
        title={t("workshops.title")}
        subtitle={t("workshops.intro")}
        image="/images/gallery/gallery-jiangnan-01.webp"
        imageAlt={t("workshops.title")}
        issue="ISSUE 05"
      />

      <section className="section-shell catalogue-section is-visible">
        <ErrorBoundary>
          <header className="catalogue-section-heading">
            <span>FIELD SESSIONS / {String(filteredWorkshops.length).padStart(2, "0")}</span>
            <p>{t("workshops.intro")}</p>
          </header>

          <div className="workshop-toolbar">
            <div className="workshop-view-switch" role="group" aria-label={t("workshops.title")}>
              <button
                type="button"
                className={viewMode === "grid" ? "is-active" : ""}
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid size={16} aria-hidden="true" /> {t("workshops.gridView")}
              </button>
              <button
                type="button"
                className={viewMode === "calendar" ? "is-active" : ""}
                aria-pressed={viewMode === "calendar"}
                onClick={() => setViewMode("calendar")}
              >
                <Calendar size={16} aria-hidden="true" /> {t("workshops.calendarView")}
              </button>
            </div>
            <label className="workshop-status-filter">
              <span>{t("workshops.filterStatusLabel")}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">{t("workshops.statusAll")}</option>
                <option value="upcoming">{t("workshops.statusUpcoming")}</option>
                <option value="ongoing">{t("workshops.status.ongoing")}</option>
                <option value="available">{t("workshops.statusAvailable")}</option>
                <option value="full">{t("workshops.statusFull")}</option>
              </select>
            </label>
            <button
              type="button"
              className="workshop-filter-mobile-btn"
              onClick={() => setFilterSheetOpen(true)}
              aria-label={t("workshops.filterSheetTitle")}
            >
              <Filter size={16} aria-hidden="true" />
              <span>{t("workshops.filter")}</span>
              {statusFilter !== "all" && <span className="workshop-filter-mobile-badge">1</span>}
            </button>
          </div>

          <DataState
            loading={loading}
            error={error}
            empty={empty || (!loading && filteredWorkshops.length === 0)}
            retry={retry}
            icon={<MapPin size={40} strokeWidth={1.2} />}
            emptyText={t("workshops.empty")}
          >
            {viewMode === "calendar" ? (
              <div className="workshop-calendar">
                {Object.entries(calendarMonths).sort(([left], [right]) => left.localeCompare(right)).map(([month, entries]) => (
                  <section key={month} className="workshop-calendar-month">
                    <header>
                      <span>{month}</span>
                      <strong>{new Intl.DateTimeFormat(i18n.language, { year: "numeric", month: "long" }).format(new Date(`${month}-01`))}</strong>
                    </header>
                    <div>
                      {entries.map((workshop) => (
                        <article key={workshop.id} className="workshop-calendar-entry">
                          <time dateTime={`${workshop.event_date}T${workshop.event_time || "00:00"}`}>
                            <span>{workshop.event_date.slice(-2)}</span>
                            {workshop.event_time}
                          </time>
                          <div>
                            <h3><Link to={`/workshops/${workshop.id}`}>{getTitle(workshop, i18n.language)}</Link></h3>
                            <p>{workshop.location || t("workshops.title")}</p>
                          </div>
                          <Link to={`/workshops/${workshop.id}`} aria-label={getTitle(workshop, i18n.language)}>
                            <ArrowUpRight size={18} aria-hidden="true" />
                          </Link>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="workshops-grid">
                {filteredWorkshops.map(renderWorkshopCard)}
              </div>
            )}
          </DataState>
        </ErrorBoundary>
      </section>

      {filterSheetOpen && (
        <div
          className="workshop-filter-overlay"
          onClick={() => setFilterSheetOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setFilterSheetOpen(false);
            }
          }}
        >
          <div
            ref={filterSheetRef}
            className="workshop-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workshop-filter-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workshop-filter-sheet-header">
              <h3 id="workshop-filter-title">{t("workshops.filterSheetTitle")}</h3>
              <button type="button" onClick={() => setFilterSheetOpen(false)} aria-label={t("common.close")}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="workshop-filter-sheet-body">
              <label className="workshop-filter-sheet-label">
                <span>{t("workshops.filterStatusLabel")}</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">{t("workshops.statusAll")}</option>
                  <option value="upcoming">{t("workshops.statusUpcoming")}</option>
                  <option value="ongoing">{t("workshops.status.ongoing")}</option>
                  <option value="available">{t("workshops.statusAvailable")}</option>
                  <option value="full">{t("workshops.statusFull")}</option>
                </select>
              </label>
            </div>
            <div className="workshop-filter-sheet-actions">
              <button
                type="button"
                className="catalogue-secondary-button"
                onClick={() => {
                  setStatusFilter("all");
                  setFilterSheetOpen(false);
                }}
              >
                {t("workshops.filterReset")}
              </button>
              <button type="button" className="catalogue-primary-button" onClick={() => setFilterSheetOpen(false)}>
                {t("workshops.filterApply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
