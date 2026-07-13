import "../styles/pages.css";
import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users, Clock, CheckCircle, X } from "lucide-react";
import { Button } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiItem } from "../hooks/useApiItem";
import { getWorkshopAvailability, useWorkshopRegistration } from "../hooks/useWorkshopRegistration";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { WorkshopCountdown } from "../components/WorkshopCountdown";
import { CapacityBar } from "../components/CapacityBar";
import { getTitle, getDesc } from "../lib/i18n-helpers";
import { tWorkshopStatus } from "../lib/i18n-typed";
import { PaymentForm } from "../components/PaymentForm";
import type { Workshop } from "../types/content";

export function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { item: workshop, loading, error } = useApiItem<Workshop>(id ? `/api/workshops/${id}` : null);
  const registration = useWorkshopRegistration(workshop);
  const [showPayment, setShowPayment] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<"pending" | null>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const confirmationRef = useFocusTrap<HTMLDivElement>({
    active: showConfirmation,
    returnFocus: false,
  });

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  const workshopTitle = workshop ? getTitle(workshop, lang) : "";
  useSEO({
    title: workshopTitle,
    descKey: "seo.workshopDetailDesc",
    path: id ? `/workshops/${id}` : undefined,
  });

  const handleRegister = async () => {
    if (!id) return;
    confirmationTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const result = await registration.register(id);
    if (result) {
      setRegistrationId(result.registrationId ?? null);
      setPaymentNotice(null);
      if (result.requiresPayment) {
        setShowPayment(true);
      } else {
        setShowConfirmation(true);
      }
    }
  };

  const closeConfirmation = (resetForm = false) => {
    setShowConfirmation(false);
    setPaymentNotice(null);
    if (resetForm) registration.resetForm();

    window.setTimeout(() => {
      const trigger = confirmationTriggerRef.current;
      if (trigger && document.contains(trigger) && !trigger.matches(":disabled")) {
        trigger.focus();
        return;
      }
      document.getElementById("workshop-detail-name")?.focus();
    }, 0);
  };

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !workshop) return <DetailNotFound message={t("workshopDetail.notFound")} backTo="/workshops" backLabel={t("workshopDetail.backToList")} />;

  const availability = getWorkshopAvailability(workshop);
  const { spotsLeft } = availability;
  const isClosed = !availability.available;
  const isCapacityFull = workshop.status === "upcoming" && spotsLeft === 0;
  const capacityLabel = workshop.status !== "upcoming"
    ? tWorkshopStatus(t, workshop.status)
    : spotsLeft === null
      ? t("workshops.statusAvailable")
      : spotsLeft === 0
        ? t("workshops.full")
        : `${t("workshops.spotsLeft")}: ${spotsLeft}`;
  const closedMessage = isCapacityFull
    ? t("workshopDetail.fullMessage")
    : t("workshopDetail.registrationClosed", {
        status: tWorkshopStatus(t, workshop.status),
      });

  return (
    <PageTransition ref={rootRef} className="catalogue-detail-page catalogue-detail-page--workshop">
      <header className="catalogue-detail-stage" id="top">
        <div className="catalogue-detail-media">
          {workshop.cover_image_url ? (
            <img
              src={workshop.cover_image_url}
              alt={getTitle(workshop, lang)}
              width={1200}
              height={900}
              fetchPriority="high"
              className="workshop-detail-cover"
            />
          ) : (
            <div className="catalogue-detail-media-placeholder">
              <MapPin size={44} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="catalogue-detail-summary">
          <DetailBackLink to="/workshops" label={t("workshopDetail.backToList")} />
          <span className="catalogue-detail-marker">FIELD SESSION / {workshop.event_date}</span>
          <h1>{getTitle(workshop, lang)}</h1>
          <p className="catalogue-detail-description">{getDesc(workshop, lang)}</p>
          <div className="workshop-detail-meta">
            <span>
              <Calendar size={14} aria-hidden="true" /> {workshop.event_date} {workshop.event_time}
            </span>
            {workshop.location && (
              <span>
                <MapPin size={14} aria-hidden="true" /> {workshop.location}
              </span>
            )}
            <span className={isClosed ? "is-full" : ""}>
              <Users size={14} aria-hidden="true" /> {capacityLabel}
            </span>
          </div>
          <WorkshopCountdown eventDate={workshop.event_date} eventTime={workshop.event_time} />
          {workshop.max_participants != null && workshop.max_participants > 0 && (
            <CapacityBar current={workshop.current_participants} max={workshop.max_participants} />
          )}
          {workshop.price_display && <strong className="catalogue-detail-price">{workshop.price_display}</strong>}
          {!isClosed && (
            <a className="catalogue-primary-button" href="#workshop-registration">
              {t("workshops.register")}
            </a>
          )}
        </div>
      </header>

      <ErrorBoundary>
      <section className="section-shell catalogue-detail-band is-visible">
        <div className="workshop-detail-section">
          <h2>{t("workshopDetail.schedule")}</h2>
          <div className="workshop-detail-timeline">
            {[
              { time: "14:00", label: t("workshopDetail.step1") },
              { time: "14:15", label: t("workshopDetail.step2") },
              { time: "14:30", label: t("workshopDetail.step3") },
              { time: "16:00", label: t("workshopDetail.step4") },
              { time: "16:45", label: t("workshopDetail.step5") },
            ].map((step, i) => (
              <div key={i} className="workshop-detail-timeline-step">
                <div className="workshop-detail-timeline-dot">{i + 1}</div>
                <div>
                  <span className="workshop-detail-timeline-time"><Clock size={12} style={{ verticalAlign: -1 }} /> {step.time}</span>
                  <p className="workshop-detail-timeline-label">{step.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell catalogue-detail-band is-visible">
        <div className="workshop-detail-section">
          <h2>{t("workshopDetail.guide")}</h2>
          <div className="workshop-detail-guide-grid">
            {[
              { title: t("workshopDetail.gearTitle"), items: t("workshopDetail.gearItems", { returnObjects: true }) as string[] },
              { title: t("workshopDetail.clothingTitle"), items: t("workshopDetail.clothingItems", { returnObjects: true }) as string[] },
              { title: t("workshopDetail.tipsTitle"), items: t("workshopDetail.tipsItems", { returnObjects: true }) as string[] },
            ].map((section, i) => (
              <div key={i} className="workshop-detail-guide-card">
                <h4>{section.title}</h4>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>
                      <CheckCircle size={14} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {workshop.location && (
        <section className="section-shell catalogue-detail-band is-visible">
          <div className="workshop-detail-section">
            <h2>{t("workshopDetail.location")}</h2>
            <div className="workshop-detail-location-card">
              <MapPin size={20} />
              <div>
                <p>{workshop.location}</p>
                <a href={`https://uri.amap.com/marker?position=&name=${encodeURIComponent(workshop.location)}`} target="_blank" rel="noreferrer">{t("workshopDetail.openInMap")}</a>
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="workshop-registration" className="section-shell catalogue-detail-band is-visible">
        <div className="workshop-detail-section">
          <h2>{t("workshopDetail.register")}</h2>
          <div className="workshop-detail-register-card">
            {workshop.price_display && <div className="workshop-detail-register-price">{workshop.price_display}</div>}
            {isClosed ? (
              <p className="workshop-detail-register-full">{closedMessage}</p>
            ) : showPayment && registrationId && workshop?.price_cents ? (
              <PaymentForm
                purpose="workshop_registration"
                amountCents={workshop.price_cents}
                currency={workshop.currency || "usd"}
                referenceId={registrationId}
                metadata={{ workshopTitle: getTitle(workshop, lang), name: registration.formName.trim() }}
                onSuccess={() => {
                  registration.setFormMsg(t("workshops.form.success"));
                  setPaymentNotice(null);
                  setShowPayment(false);
                  registration.resetForm();
                }}
                onPending={() => {
                  setPaymentNotice("pending");
                  setShowPayment(false);
                  setShowConfirmation(true);
                }}
                onError={() => {}}
                onCancel={() => setShowPayment(false)}
              />
            ) : (
              <>
                {registration.availability && !registration.availability.available && (
                  <div className="workshop-detail-register-full">
                    {t("workshopDetail.fullMessage")}
                  </div>
                )}
                {registration.checkingAvailability && (
                  <div className="workshop-detail-availability-checking">
                    {t("workshops.form.checkingAvailability")}
                  </div>
                )}
                <div className="workshop-detail-field">
                  <label htmlFor="workshop-detail-name" className="sr-only">
                    {t("workshops.form.name")}
                  </label>
                  <input
                    id="workshop-detail-name"
                    value={registration.formName}
                    onChange={(e) => registration.setFormName(e.target.value)}
                    placeholder={t("workshops.form.name")}
                    className={`workshop-detail-register-input ${registration.formName && registration.formName.length < 2 ? "has-error" : ""}`}
                    aria-label={t("workshops.form.name")}
                    aria-invalid={registration.formName.length > 0 && registration.formName.length < 2}
                    disabled={registration.availability?.available === false || registration.checkingAvailability}
                    maxLength={50}
                  />
                  {registration.formName.length > 0 && registration.formName.length < 2 && (
                    <span className="workshop-detail-field-error">{t("workshops.form.nameTooShort")}</span>
                  )}
                </div>
                <div className="workshop-detail-field">
                  <label htmlFor="workshop-detail-contact" className="sr-only">
                    {t("workshops.form.contact")}
                  </label>
                  <input
                    id="workshop-detail-contact"
                    value={registration.formContact}
                    onChange={(e) => registration.setFormContact(e.target.value)}
                    placeholder={t("workshops.form.contact")}
                    className={`workshop-detail-register-input ${registration.formContact && registration.formContact.length < 5 ? "has-error" : ""}`}
                    aria-label={t("workshops.form.contact")}
                    aria-invalid={registration.formContact.length > 0 && registration.formContact.length < 5}
                    disabled={registration.availability?.available === false || registration.checkingAvailability}
                    maxLength={100}
                  />
                  {registration.formContact.length > 0 && registration.formContact.length < 5 && (
                    <span className="workshop-detail-field-error">{t("workshops.form.contactTooShort")}</span>
                  )}
                </div>
                {registration.formMsg && <p className={`workshop-detail-form-msg${registration.formMsg === t("workshops.form.success") ? " workshop-detail-form-msg--success" : " workshop-detail-form-msg--error"}`}>{registration.formMsg}</p>}
                <Button
                  type="primary"
                  onClick={handleRegister}
                  disabled={registration.submitting || registration.availability?.available === false || registration.checkingAvailability || !registration.formName.trim() || registration.formContact.trim().length < 5}
                >
                  {registration.submitting
                    ? t("workshops.form.submitting")
                    : registration.checkingAvailability
                      ? t("workshops.form.checkingAvailability")
                      : registration.availability?.available === false
                        ? t("workshops.form.full")
                        : t("workshops.register")}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {showConfirmation && workshop && (
        <div
          className="workshop-confirmation-overlay"
          onClick={() => closeConfirmation()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeConfirmation();
            }
          }}
        >
          <div ref={confirmationRef} className="workshop-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="workshop-confirmation-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="workshop-confirmation-close" onClick={() => closeConfirmation()} aria-label={t("common.close")}>
              <X size={20} aria-hidden="true" />
            </button>
            <CheckCircle size={48} className="workshop-confirmation-icon" />
            <h2 id="workshop-confirmation-title">{t("workshops.form.success")}</h2>
            <div className="workshop-confirmation-details">
              <p><strong>{t("workshops.title")}:</strong> {workshopTitle}</p>
              {workshop.event_date && <p><strong>{t("workshops.detail.date")}:</strong> {workshop.event_date}</p>}
              {workshop.location && <p><strong>{t("workshops.detail.location")}:</strong> {workshop.location}</p>}
              {registrationId && <p><strong>{t("workshops.confirmation.registrationId")}:</strong> {registrationId}</p>}
              <p><strong>{t("workshops.confirmation.name")}:</strong> {registration.formName}</p>
              <p><strong>{t("workshops.confirmation.contact")}:</strong> {registration.formContact}</p>
            </div>
            {paymentNotice === "pending" && (
              <div className="workshop-payment-status-note" role="status">
                <strong>{t("workshopDetail.paymentPendingTitle")}</strong>
                <span>{t("workshopDetail.paymentPendingDesc")}</span>
              </div>
            )}
            <p className="workshop-confirmation-email">{t("workshops.confirmation.emailSent")}</p>
            <Button type="primary" onClick={() => closeConfirmation(true)}>
              {t("workshops.confirmation.close")}
            </Button>
          </div>
        </div>
      )}
      </ErrorBoundary>
    </PageTransition>
  );
}
