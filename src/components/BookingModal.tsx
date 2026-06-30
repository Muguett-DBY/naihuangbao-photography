import { Button, Input, Modal } from "animal-island-ui";
import { type FormEvent, useEffect, useId, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ExternalLink, LayoutDashboard } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { useNotification } from "../hooks/useNotification";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useModalA11y } from "../hooks/useModalA11y";
import { PaymentForm } from "./PaymentForm";
import { BookingCalendar, type BookingTimeSlotKey, type DateInfo } from "./BookingCalendar";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { getApiError, readJsonResponse } from "../lib/http";
import { track } from "../utils/track";
import { savePendingBooking } from "../utils/offlineBooking";
import { isBookableBusinessDate, isRealDateKey } from "../utils/businessDate";
import { useBookingPolicy } from "../hooks/useBookingPolicy";

type BookingModalProps = {
  initialPackage?: string;
  onClose: () => void;
};

type FormErrors = {
  name?: string;
  contact?: string;
  date?: string;
  time?: string;
};

type WaitlistResponse = {
  message?: string;
  waitlist?: {
    id?: string;
    duplicate?: boolean;
  };
};

const BOOKING_TIME_SLOT_KEYS: BookingTimeSlotKey[] = ["morning", "afternoon", "fullDay"];

export function BookingModal({ initialPackage, onClose }: BookingModalProps) {
  const { t } = useTranslation();
  const { packages, siteConfig } = useSiteContent();
  const { sendBookingConfirmation, sending: notificationSending } = useNotification();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPkg, setSelectedPkg] = useState(initialPackage || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedDateAvailability, setSelectedDateAvailability] = useState<DateInfo | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [depositOutcome, setDepositOutcome] = useState<"pending" | "deferred" | "offline" | null>(null);
  const [waitlistDate, setWaitlistDate] = useState("");
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistAlreadyJoined, setWaitlistAlreadyJoined] = useState(false);
  const [waitlistId, setWaitlistId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { policy: bookingPolicy } = useBookingPolicy();
  const earliestBookingDate = bookingPolicy.earliestDate;
  const titleId = useId();
  const descriptionId = useId();
  const successBridgeTitleId = useId();
  const contentRef = useFocusTrap<HTMLDivElement>({ initialFocus: "first" });
  useModalA11y({ open: true, titleId, descriptionId });

  const slotOptions = useMemo(() => BOOKING_TIME_SLOT_KEYS.map((slot) => {
    const slotInfo = selectedDateAvailability?.timeSlots?.[slot];
    const unavailable = slotInfo?.status === "booked";
    return {
      slot,
      unavailable,
      label: String(t(`bookingModal.${slot}` as never)),
      statusLabel: unavailable
        ? t("bookingModal.timeSlotUnavailable", "Unavailable")
        : t("bookingModal.timeSlotAvailable", "Available"),
    };
  }), [selectedDateAvailability, t]);

  const isSelectedTimeUnavailable = useCallback((value: string) => {
    if (!value) return false;
    return slotOptions.some((option) => option.slot === value && option.unavailable);
  }, [slotOptions]);

  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) return t("bookingModal.nameRequired", "Please enter your name");
        if (value.trim().length < 2) return t("bookingModal.nameTooShort", "Name must be at least 2 characters");
        return undefined;
      case "contact":
        if (!value.trim()) return t("bookingModal.contactRequired", "Please enter your contact");
        if (value.trim().length < 5) return t("bookingModal.contactTooShort", "Contact must be at least 5 characters");
        return undefined;
      case "date":
        if (!value) return undefined;
        if (!isRealDateKey(value)) return t("bookingModal.dateInvalid", "Please choose a valid date");
        if (!isBookableBusinessDate(value, earliestBookingDate)) {
          return t("bookingModal.datePast", { date: earliestBookingDate, defaultValue: "Please choose {{date}} or later" });
        }
        return undefined;
      case "time":
        if (isSelectedTimeUnavailable(value)) {
          return t("bookingModal.timeUnavailable", "This time window is already unavailable for the selected date.");
        }
        return undefined;
      default:
        return undefined;
    }
  }, [earliestBookingDate, isSelectedTimeUnavailable, t]);

  useEffect(() => {
    if (!time || !isSelectedTimeUnavailable(time)) return;
    setTime("");
    setErrors((prev) => ({
      ...prev,
      time: t("bookingModal.timeSlotClearNotice", "That time was unavailable for this date, so I cleared it."),
    }));
  }, [isSelectedTimeUnavailable, t, time]);

  const handleBlur = useCallback((field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, [validateField]);

  const handleChange = useCallback((field: string, value: string) => {
    if (field === "name") setName(value);
    else if (field === "contact") setContact(value);
    else if (field === "date") setDate(value);

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  }, [touched, validateField]);

  const handleDateSelect = useCallback((nextDate: string) => {
    setWaitlistDate("");
    handleChange("date", nextDate);
    setTouched((prev) => ({ ...prev, date: true }));
    setErrors((prev) => ({ ...prev, date: validateField("date", nextDate) }));
  }, [handleChange, validateField]);

  const handleTimeChange = useCallback((nextTime: string) => {
    setTime(nextTime);
    setTouched((prev) => ({ ...prev, time: true }));
    setErrors((prev) => ({ ...prev, time: validateField("time", nextTime) }));
  }, [validateField]);

  const handleWaitlistDate = useCallback((nextDate: string) => {
    setDate(nextDate);
    setWaitlistDate(nextDate);
    setWaitlistAlreadyJoined(false);
    setTouched((prev) => ({ ...prev, date: true }));
    setErrors((prev) => ({ ...prev, date: validateField("date", nextDate) }));
    setStep(2);
    setError("");
    track("booking_waitlist_started", { packageName: selectedPkg, date: nextDate });
  }, [selectedPkg, validateField]);

  const isFormValid = name.trim().length >= 2 && contact.trim().length >= 5;

  const handleNext = useCallback(() => {
    const dateError = validateField("date", date);
    const timeError = validateField("time", time);
    setErrors((prev) => ({ ...prev, date: dateError, time: timeError }));
    setTouched((prev) => ({ ...prev, date: true, time: true }));
    if (dateError || timeError) return;

    setStep(2);
    setError("");
    track("booking_step1_done", { packageName: selectedPkg, date, time });
  }, [date, selectedPkg, time, validateField]);

  const handleBack = useCallback(() => {
    setStep(1);
    setWaitlistDate("");
    setError("");
    track("booking_back_to_step1", { packageName: selectedPkg });
  }, [selectedPkg]);

  async function submitWaitlist(trimmedName: string, trimmedContact: string) {
    const preferredDate = waitlistDate || date;
    if (!preferredDate) {
      setError(t("bookingModal.dateRequired", "Please choose a date"));
      return;
    }

    setJoiningWaitlist(true);
    setError("");

    try {
      const response = await fetch("/api/booking/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({
          preferredDate,
          packageName: selectedPkg,
          name: trimmedName,
          contact: trimmedContact,
        }),
      });
      const data = await readJsonResponse<WaitlistResponse>(response);

      if (!response.ok) {
        throw new Error(getApiError(data, t("bookingModal.waitlistSubmitError")));
      }

      const alreadyJoined = data?.message === "already_waitlisted" || data?.waitlist?.duplicate === true;
      setWaitlistId(data?.waitlist?.id ?? null);
      setWaitlistAlreadyJoined(alreadyJoined);
      setWaitlistDone(true);
      track(alreadyJoined ? "booking_waitlist_duplicate" : "booking_waitlist_joined", { packageName: selectedPkg, date: preferredDate });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookingModal.waitlistSubmitError"));
    } finally {
      setJoiningWaitlist(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const nameError = validateField("name", name);
    const contactError = validateField("contact", contact);
    const dateError = validateField("date", date);
    const timeError = validateField("time", time);
    setErrors({ name: nameError, contact: contactError, date: dateError, time: timeError });
    setTouched({ name: true, contact: true, date: true, time: true });

    if (nameError || contactError || dateError || timeError) return;

    const trimmedName = name.trim().slice(0, 50);
    const trimmedContact = contact.trim().slice(0, 100);
    const trimmedNotes = notes.trim().slice(0, 500);

    if (waitlistDate) {
      await submitWaitlist(trimmedName, trimmedContact);
      return;
    }

    setSending(true);
    setError("");

    try {
      // Check if online
      if (!navigator.onLine) {
        // Save to IndexedDB for later sync
        const bookingId = await savePendingBooking({
          packageName: selectedPkg,
          preferredDate: date,
          preferredTime: time,
          name: trimmedName,
          contact: trimmedContact,
          notes: trimmedNotes,
        });
        if (!bookingId) {
          throw new Error(t("bookingModal.offlineSaveError", "This booking could not be saved on this device. Please reconnect and try again."));
        }
        setBookingId(bookingId);
        setSavedOffline(true);
        setDepositOutcome("offline");
        setDone(true);
        track("booking_offline_saved", { packageName: selectedPkg, bookingId: bookingId ?? "" });
        return;
      }

      const r = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({
          packageName: selectedPkg,
          preferredDate: date,
          preferredTime: time,
          name: trimmedName,
          contact: trimmedContact,
          notes: trimmedNotes,
        }),
      });

      if (!r.ok) {
        const data = await readJsonResponse(r);
        if (data && typeof data === "object" && "error" in data && data.error === "fully_booked" && date) {
          setWaitlistDate(date);
          setError(t("bookingModal.fullDateWaitlistPrompt"));
          return;
        }
        throw new Error(getApiError(data, t("bookingModal.submitError")));
      }

      const data = await readJsonResponse<{ id?: string }>(r);
      if (!data?.id) throw new Error(t("bookingModal.submitError"));
      setBookingId(data.id);
      setShowPayment(true);
      track("booking_submitted", { packageName: selectedPkg, bookingId: data.id, hasNotes: Boolean(trimmedNotes) });

      await sendBookingConfirmation(trimmedContact, {
        bookingId: data.id,
        packageName: selectedPkg,
        preferredDate: date,
        preferredTime: time,
        name: trimmedName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookingModal.submitError"));
    } finally {
      setSending(false);
    }
  }

  const packageOptions = packages.map((p) => (
    <option key={p.name} value={p.name}>{p.name} — {p.price}</option>
  ));

  const calculateDepositCents = (): number => {
    if (!selectedPkg) return 2000;
    const pkg = packages.find((p) => p.name === selectedPkg);
    if (!pkg) return 2000;
    const match = pkg.price.match(/(\d+(?:\.\d+)?)/);
    if (!match) return 2000;
    const hourlyRate = parseFloat(match[1]);
    const minimumHours = 2;
    const depositPercent = 0.3;
    const deposit = Math.round(hourlyRate * minimumHours * depositPercent * 100);
    return Math.max(deposit, 2000);
  };

  const renderSuccessBridge = (detail: string) => (
    <section className="booking-success-bridge" aria-labelledby={successBridgeTitleId}>
      <div className="booking-success-bridge-copy">
        <span>{t("bookingModal.successBridgeEyebrow", "Next steps")}</span>
        <h3 id={successBridgeTitleId}>{t("bookingModal.successBridgeTitle", "Keep your session moving")}</h3>
        <p>{detail}</p>
      </div>
      <div className="booking-success-bridge-actions">
        <Link
          to="/dashboard"
          className="booking-success-bridge-action booking-success-bridge-action--primary booking-success-dashboard-btn"
          onClick={onClose}
        >
          <LayoutDashboard size={16} aria-hidden="true" />
          {t("bookingModal.viewDashboard")}
        </Link>
        <a
          href={siteConfig.xiaohongshuProfile}
          target="_blank"
          rel="noreferrer"
          className="booking-success-bridge-action booking-success-bridge-action--secondary"
        >
          <ExternalLink size={16} aria-hidden="true" />
          {t("bookingModal.messageOnXiaohongshu", "Message on Xiaohongshu")}
        </a>
        <button type="button" className="booking-success-bridge-action booking-success-bridge-action--ghost" onClick={onClose}>
          {t("bookingModal.continueBrowsing", "Continue browsing")}
        </button>
      </div>
    </section>
  );

  if (waitlistDone) {
    const selectedPackageName = packages.find((p) => p.name === selectedPkg)?.name || selectedPkg;
    const waitlistTitle = waitlistAlreadyJoined
      ? t("bookingModal.waitlistAlreadyJoinedTitle")
      : t("bookingModal.waitlistSuccessTitle");
    const waitlistDescription = waitlistAlreadyJoined
      ? t("bookingModal.waitlistAlreadyJoinedDescription")
      : t("bookingModal.waitlistSuccessDescription");
    return (
      <Modal open onClose={onClose} footer={null} typewriter={false}>
        <span id={titleId} className="sr-only">{waitlistTitle}</span>
        <div ref={contentRef} className="booking-modal-content">
          <div className={`booking-modal-success booking-waitlist-success${waitlistAlreadyJoined ? " booking-waitlist-success--existing" : ""}`}>
            <div className="booking-success-check">
              <svg viewBox="0 0 24 24" className="booking-success-check-svg" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>{waitlistTitle}</h2>
            <p className="booking-success-next">
              {waitlistDescription}
            </p>
            <div className="booking-success-details">
              {waitlistId && (
                <div className="booking-success-detail-item">
                  <span className="booking-success-detail-label">{t("bookingModal.reference")}</span>
                  <span className="booking-success-detail-value">#{waitlistId.slice(0, 8).toUpperCase()}</span>
                </div>
              )}
              <div className="booking-success-detail-item">
                <span className="booking-success-detail-label">{t("bookingModal.date")}</span>
                <span className="booking-success-detail-value">{waitlistDate || date}</span>
              </div>
              {selectedPackageName && (
                <div className="booking-success-detail-item">
                  <span className="booking-success-detail-label">{t("bookingModal.selectPackage")}</span>
                  <span className="booking-success-detail-value">{selectedPackageName}</span>
                </div>
              )}
            </div>
            {renderSuccessBridge(t("bookingModal.successBridgeWaitlistDetail", "Your waitlist status is saved here; check bookings or message me if timing changes."))}
          </div>
        </div>
      </Modal>
    );
  }

  // ── Payment step ──
  if (showPayment && bookingId) {
    return (
      <Modal open onClose={onClose} footer={null} typewriter={false}>
        <span id={titleId} className="sr-only">{t("bookingModal.paymentTitle", "Payment")}</span>
        <div ref={contentRef} className="booking-modal-content">
          <PaymentForm
            purpose="booking_deposit"
            amountCents={calculateDepositCents()}
            currency="cny"
            referenceId={bookingId}
            metadata={{ packageName: selectedPkg, name: name.trim() }}
            onSuccess={() => {
              setDepositOutcome(null);
              setDone(true);
              setShowPayment(false);
            }}
            onPending={() => {
              setDepositOutcome("pending");
              setDone(true);
              setShowPayment(false);
            }}
            onError={(err) => {
              setError(err);
              setShowPayment(false);
            }}
            onCancel={() => {
              setDepositOutcome("deferred");
              setDone(true);
              setShowPayment(false);
            }}
          />
        </div>
      </Modal>
    );
  }

  // ── Success state ──
  if (done) {
    const selectedPackageName = packages.find((p) => p.name === selectedPkg)?.name;
    const timeLabel: string = time ? String(t(`bookingModal.${time}` as any)) : String(t("bookingModal.any"));
    const bookingPaymentClaritySteps = [
      {
        key: "saved",
        label: t("bookingModal.paymentClarity.saved", "Booking saved"),
        detail: t("bookingModal.paymentClarity.savedDetail", "Your request has a reference number and can be checked later."),
      },
      {
        key: "notCharged",
        label: t("bookingModal.paymentClarity.notCharged", "No deposit charged"),
        detail: t("bookingModal.paymentClarity.notChargedDetail", "Placeholder payment mode only records the deposit status."),
      },
      {
        key: "followUp",
        label: t("bookingModal.paymentClarity.followUp", "Follow-up next"),
        detail: t("bookingModal.paymentClarity.followUpDetail", "We will confirm schedule and payment options before collection."),
      },
    ];
    return (
      <Modal open onClose={onClose} footer={null} typewriter={false}>
        <span id={titleId} className="sr-only">{t("bookingModal.successTitle")}</span>
        <div ref={contentRef} className="booking-modal-content">
        <div className="booking-modal-success">
          <div className="booking-success-check">
            <svg viewBox="0 0 24 24" className="booking-success-check-svg" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>{t("bookingModal.successTitle")}</h2>

          <div className="booking-success-details">
            <div className="booking-success-detail-item">
              <span className="booking-success-detail-label">{t("bookingModal.reference")}</span>
              <span className="booking-success-detail-value">#{bookingId?.slice(0, 8).toUpperCase()}</span>
            </div>
            {selectedPackageName && (
              <div className="booking-success-detail-item">
                <span className="booking-success-detail-label">{t("bookingModal.selectPackage")}</span>
                <span className="booking-success-detail-value">{selectedPackageName}</span>
              </div>
            )}
            {date && (
              <div className="booking-success-detail-item">
                <span className="booking-success-detail-label">{t("bookingModal.date")}</span>
                <span className="booking-success-detail-value">{date}</span>
              </div>
            )}
            <div className="booking-success-detail-item">
              <span className="booking-success-detail-label">{t("bookingModal.time")}</span>
              <span className="booking-success-detail-value">{timeLabel}</span>
            </div>
          </div>

          <p className="booking-success-next">{t("bookingModal.nextStep")}</p>
          {depositOutcome && (
            <div className={`booking-deposit-outcome booking-deposit-outcome--${depositOutcome}`} role="status">
              <strong>{t(`bookingModal.depositOutcome.${depositOutcome}.title`)}</strong>
              <span>{t(`bookingModal.depositOutcome.${depositOutcome}.description`)}</span>
            </div>
          )}
          <section className="booking-payment-clarity" aria-label={t("bookingModal.paymentClarityLabel", "Payment status next steps")}>
            <p className="booking-payment-clarity-title">{t("bookingModal.paymentClarityTitle", "What happens with the deposit")}</p>
            <ol className="booking-payment-clarity-steps">
              {bookingPaymentClaritySteps.map((item, index) => (
                <li key={item.key} className="booking-payment-clarity-step">
                  <span className="booking-payment-clarity-index" aria-hidden="true">{index + 1}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          {savedOffline && (
            <p className="booking-success-offline-note">
              {t("bookingModal.offlineSyncNotice")}
            </p>
          )}
          {renderSuccessBridge(t("bookingModal.successBridgeDashboardDetail", "Check status, date changes, and deposit updates in your dashboard."))}
        </div>
        </div>
      </Modal>
    );
  }

  // ── Form state (multi-step) ──
  const isWaitlistMode = Boolean(waitlistDate);
  const actionBusy = sending || joiningWaitlist;
  const actionLabel = isWaitlistMode ? t("bookingModal.joinWaitlist") : t("bookingModal.submit");
  const busyLabel = isWaitlistMode ? t("bookingModal.joiningWaitlist") : t("bookingModal.submitting");

  return (
    <Modal
      open
      onClose={onClose}
      title={t("bookingModal.title")}
      typewriter={false}
      maskClosable={false}
      footer={null}
    >
      <span id={titleId} className="sr-only">{t("bookingModal.title")}</span>
      <span id={descriptionId} className="sr-only">{t("bookingModal.subtitle")}</span>
      <div ref={contentRef} className="booking-modal-content">
      <p className="booking-subtitle">
        {t("bookingModal.subtitle")}
      </p>

      {/* Step indicator */}
      <div className="booking-steps" role="navigation" aria-label={t("bookingModal.stepNavigation", "Booking steps")}>
        <div className={`booking-step-dot ${step === 1 ? "is-active" : step === 2 ? "is-done" : ""}`}>
          <span>1</span>
        </div>
        <div className="booking-step-line" />
        <div className={`booking-step-dot ${step === 2 ? "is-active" : ""}`}>
          <span>2</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Step 1: Session details */}
        {step === 1 && (
          <div className="booking-step-content">
            <div className="booking-field">
              <label htmlFor="booking-package">{t("bookingModal.selectPackage")}</label>
              <select id="booking-package" value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)}>
                <option value="">{t("bookingModal.anyPackage")}</option>
                {packageOptions}
              </select>
            </div>

            <div className={`booking-field ${errors.date && touched.date ? "has-error" : ""}`}>
              <label>{t("bookingModal.date")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
              <BookingCalendar
                selectedDate={date}
                onSelectDate={handleDateSelect}
                onRequestWaitlist={handleWaitlistDate}
                onSelectedDateInfoChange={setSelectedDateAvailability}
                minDate={earliestBookingDate}
                policyTimeZone={bookingPolicy.timeZone}
                capacityPerDay={bookingPolicy.capacityPerDay}
              />
              {errors.date && touched.date && (
                <span className="booking-field-error">{errors.date}</span>
              )}
            </div>

            <div className="booking-field">
              <label htmlFor="booking-time">{t("bookingModal.time")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
              <select
                id="booking-time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                aria-describedby={errors.time && touched.time ? "booking-time-error" : "booking-time-slots"}
              >
                <option value="">{t("bookingModal.any")}</option>
                {slotOptions.map((option) => (
                  <option key={option.slot} value={option.slot} disabled={option.unavailable}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div id="booking-time-slots" className="booking-time-slot-grid" role="list" aria-label={t("bookingModal.timeSlotStatusLabel", "Time availability")}>
                {slotOptions.map((option) => (
                  <span
                    key={option.slot}
                    className={`booking-time-slot-pill${option.unavailable ? " is-unavailable" : " is-available"}`}
                    role="listitem"
                  >
                    <span>{option.label}</span>
                    <small>{option.statusLabel}</small>
                  </span>
                ))}
              </div>
              <p className="booking-time-slot-hint">{t("bookingModal.timeSlotLimitedHint", "Choose an available window or leave Any if you can be flexible.")}</p>
              {errors.time && touched.time && (
                <span id="booking-time-error" className="booking-field-error">{errors.time}</span>
              )}
            </div>

            <div className="booking-actions">
              <Button type="default" onClick={onClose}>{t("bookingModal.cancel")}</Button>
              <Button type="primary" onClick={handleNext}>
                {t("bookingModal.next", "Next")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Personal info */}
        {step === 2 && (
          <div className="booking-step-content">
            <button type="button" className="booking-back-btn" onClick={handleBack}>
              <ChevronLeft size={16} />
              {t("bookingModal.back", "Back")}
            </button>

            {waitlistDate && (
              <div className="booking-waitlist-notice" role="status">
                <strong>{t("bookingModal.waitlistNoticeTitle")}</strong>
                <span>{t("bookingModal.waitlistNoticeDescription", { date: waitlistDate })}</span>
              </div>
            )}

            <div className={`booking-field ${errors.name && touched.name ? "has-error" : ""} ${touched.name && !errors.name && name.trim().length >= 2 ? "is-valid" : ""}`}>
              <label htmlFor="booking-name">{t("bookingModal.name")} <span className="booking-required">*</span></label>
              <Input
                id="booking-name"
                value={name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name", name)}
                placeholder={t("bookingModal.namePlaceholder")}
                maxLength={50}
                required
                shadow
              />
              <div className="booking-field-extra">
                <span className="booking-field-count">{name.length}/50</span>
              </div>
              {errors.name && touched.name && (
                <span className="booking-field-error">{errors.name}</span>
              )}
            </div>

            <div className={`booking-field ${errors.contact && touched.contact ? "has-error" : ""} ${touched.contact && !errors.contact && contact.trim().length >= 5 ? "is-valid" : ""}`}>
              <label htmlFor="booking-contact">{t("bookingModal.contact")} <span className="booking-required">*</span></label>
              <Input
                id="booking-contact"
                value={contact}
                onChange={(e) => handleChange("contact", e.target.value)}
                onBlur={() => handleBlur("contact", contact)}
                placeholder={t("bookingModal.contactPlaceholder")}
                required
                shadow
              />
              {errors.contact && touched.contact && (
                <span className="booking-field-error">{errors.contact}</span>
              )}
            </div>

            <div className="booking-field">
              <label htmlFor="booking-notes">{t("bookingModal.message")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
              <textarea
                id="booking-notes"
                className="booking-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("bookingModal.messagePlaceholder")}
                rows={3}
              />
            </div>

            {error && <p className="booking-error" role="alert">{error}</p>}

            <div className="booking-actions">
              <Button type="default" onClick={handleBack}>{t("bookingModal.back", "Back")}</Button>
              <Button type="primary" htmlType="submit" disabled={actionBusy || !isFormValid}>
                {actionBusy ? (
                  <span className="booking-btn-loading">
                    <span className="booking-btn-spinner" />
                    {busyLabel}
                  </span>
                ) : actionLabel}
              </Button>
            </div>

            <p className="booking-footer">
              {t("bookingModal.agreement")}
              <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">{t("bookingModal.contact")}</a>
            </p>
          </div>
        )}
      </form>
      </div>
    </Modal>
  );
}
