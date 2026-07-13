import { Button, Input, Modal } from "animal-island-ui";
import { type FormEvent, useEffect, useId, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ExternalLink, LayoutDashboard, X } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { useNotification } from "../hooks/useNotification";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useModalA11y } from "../hooks/useModalA11y";
import { PaymentForm } from "./PaymentForm";
import { BookingCalendar, type DateInfo } from "./BookingCalendar";
import { BookingTimeSlotPicker, isBookingTimeSlotUnavailable } from "./BookingTimeSlotPicker";
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
  accountLinked?: boolean;
  message?: string;
  waitlist?: {
    id?: string;
    duplicate?: boolean;
  };
};

type TimeSlotRecovery = {
  canKeepDate?: boolean;
  requestedTime?: string;
  suggestedTime?: string;
  availableTimeSlots?: string[];
};

type BookingSubmitErrorResponse = {
  error?: string;
  message?: string;
  timeSlots?: DateInfo["timeSlots"];
  recovery?: TimeSlotRecovery;
};

type BookingSubmitResponse = {
  id?: string;
  accountLinked?: boolean;
};

export function BookingModal({ initialPackage, onClose }: BookingModalProps) {
  const { t } = useTranslation();
  const { packages, siteConfig } = useSiteContent();
  const { sendBookingConfirmation, sending: notificationSending } = useNotification();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPkg, setSelectedPkg] = useState(initialPackage || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedDateAvailability, setSelectedDateAvailability] = useState<DateInfo | null>(null);
  const [recoveredDateAvailability, setRecoveredDateAvailability] = useState<{ date: string; info: DateInfo } | null>(null);
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
  const [accountLinked, setAccountLinked] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { policy: bookingPolicy } = useBookingPolicy();
  const earliestBookingDate = bookingPolicy.earliestDate;
  const titleId = useId();
  const descriptionId = useId();
  const successBridgeTitleId = useId();
  const contentRef = useFocusTrap<HTMLDivElement>({ initialFocus: "first" });
  useModalA11y({ open: true, titleId, descriptionId });

  const isSelectedTimeUnavailable = useCallback((value: string) => {
    return isBookingTimeSlotUnavailable(selectedDateAvailability, value);
  }, [selectedDateAvailability]);

  const formatTimeLabel = useCallback((value: string) => {
    return value ? String(t(`bookingModal.${value}` as any)) : String(t("bookingModal.any"));
  }, [t]);

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

  useEffect(() => {
    const rail = contentRef.current?.querySelector<HTMLOListElement>(".booking-step-rail");
    const current = rail?.querySelector<HTMLElement>("[aria-current='step']");
    if (!rail || !current || rail.scrollWidth <= rail.clientWidth) return;

    const centeredLeft = current.offsetLeft - ((rail.clientWidth - current.offsetWidth) / 2);
    rail.scrollTo({ left: Math.max(0, centeredLeft), behavior: "auto" });
  }, [bookingId, contentRef, done, showPayment, step, waitlistDone]);

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
    setRecoveredDateAvailability(null);
    handleChange("date", nextDate);
    setTouched((prev) => ({ ...prev, date: true }));
    setErrors((prev) => ({ ...prev, date: validateField("date", nextDate) }));
  }, [handleChange, validateField]);

  const handleSelectedDateInfoChange = useCallback((info: DateInfo | null) => {
    if (recoveredDateAvailability?.date === date) {
      setSelectedDateAvailability(recoveredDateAvailability.info);
      return;
    }
    setSelectedDateAvailability(info);
  }, [date, recoveredDateAvailability]);

  const handleTimeChange = useCallback((nextTime: string) => {
    setTime(nextTime);
    setTouched((prev) => ({ ...prev, time: true }));
    setErrors((prev) => ({ ...prev, time: validateField("time", nextTime) }));
  }, [validateField]);

  const handleWaitlistDate = useCallback((nextDate: string) => {
    setDate(nextDate);
    setWaitlistDate(nextDate);
    setRecoveredDateAvailability(null);
    setWaitlistAlreadyJoined(false);
    setAccountLinked(false);
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
    setAccountLinked(false);
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
    setAccountLinked(false);
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
      setAccountLinked(data?.accountLinked === true);
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
    setAccountLinked(false);

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
        const data = await readJsonResponse<BookingSubmitErrorResponse>(r);
        if (data && typeof data === "object" && "error" in data && data.error === "fully_booked" && date) {
          setWaitlistDate(date);
          setError(t("bookingModal.fullDateWaitlistPrompt"));
          return;
        }
        if (data?.error === "time_unavailable") {
          const recoveredAvailability: DateInfo = {
            status: selectedDateAvailability?.status ?? "partial",
            count: selectedDateAvailability?.count ?? 0,
            capacity: selectedDateAvailability?.capacity,
            remaining: selectedDateAvailability?.remaining,
            timeSlots: data.timeSlots,
          };
          setRecoveredDateAvailability({ date, info: recoveredAvailability });
          setSelectedDateAvailability(recoveredAvailability);
          const suggestedTime = data.recovery?.suggestedTime ?? "";
          setTime(suggestedTime);
          setTouched((prev) => ({ ...prev, time: true }));
          setErrors((prev) => ({
            ...prev,
            time: suggestedTime ? undefined : t("bookingModal.timeUnavailable"),
          }));
          setStep(1);
          setError(suggestedTime
            ? t("bookingModal.timeSlotRecoveryHint", { time: formatTimeLabel(suggestedTime) })
            : t("bookingModal.timeUnavailable"));
          return;
        }
        throw new Error(getApiError(data, t("bookingModal.submitError")));
      }

      const data = await readJsonResponse<BookingSubmitResponse>(r);
      if (!data?.id) throw new Error(t("bookingModal.submitError"));
      setBookingId(data.id);
      setAccountLinked(data.accountLinked === true);
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

  const showDashboard = accountLinked;

  const renderStepRail = (currentStage: 1 | 2 | 3 | 4 | 5) => {
    const stages = [
      t("bookingModal.selectPackage"),
      `${t("bookingModal.date")} / ${t("bookingModal.time")}`,
      t("bookingModal.contact"),
      t("payment.title"),
      t("bookingModal.successTitle"),
    ];

    return (
      <ol className="booking-step-rail" aria-label={t("bookingModal.stepNavigation")}>
        {stages.map((label, index) => {
          const stage = (index + 1) as 1 | 2 | 3 | 4 | 5;
          return (
            <li
              key={label}
              className={`${stage < currentStage ? "is-complete" : ""}${stage === currentStage ? " is-current" : ""}`.trim()}
              aria-current={stage === currentStage ? "step" : undefined}
            >
              <span aria-hidden="true">{String(stage).padStart(2, "0")}</span>
              <strong>{label}</strong>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderSuccessBridge = (detail: string, options: { showDashboard: boolean }) => (
    <section className="booking-success-bridge" aria-labelledby={successBridgeTitleId}>
      <div className="booking-success-bridge-copy">
        <span>{t("bookingModal.successBridgeEyebrow", "Next steps")}</span>
        <h3 id={successBridgeTitleId}>{t("bookingModal.successBridgeTitle", "Keep your session moving")}</h3>
        <p>{detail}</p>
      </div>
      <div className="booking-success-bridge-actions">
        {options.showDashboard && (
          <Link
            to="/dashboard"
            className="booking-success-bridge-action booking-success-bridge-action--primary booking-success-dashboard-btn"
            onClick={onClose}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            {t("bookingModal.viewDashboard")}
          </Link>
        )}
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
          {renderStepRail(5)}
          <section className="booking-numbered-group booking-numbered-group--success" aria-labelledby="booking-waitlist-confirmation-title">
            <header className="booking-numbered-group-heading">
              <span className="booking-group-index">05</span>
              <h2 id="booking-waitlist-confirmation-title">{waitlistTitle}</h2>
            </header>
            <div className={`booking-modal-success booking-waitlist-success${waitlistAlreadyJoined ? " booking-waitlist-success--existing" : ""}`}>
            <div className="booking-success-check">
              <svg viewBox="0 0 24 24" className="booking-success-check-svg" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
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
            {renderSuccessBridge(
              showDashboard
                ? t("bookingModal.successBridgeWaitlistDetail", "This waitlist request is linked to your signed-in account. View its status in your dashboard.")
                : t("bookingModal.successBridgeContactDetail", "Updates will go to the contact details you provided. Message me if anything changes."),
              { showDashboard },
            )}
            </div>
          </section>
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
          {renderStepRail(4)}
          <section className="booking-numbered-group booking-numbered-group--payment" aria-labelledby="booking-payment-title">
            <header className="booking-numbered-group-heading">
              <span className="booking-group-index">04</span>
              <h2 id="booking-payment-title">{t("payment.title")}</h2>
            </header>
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
          </section>
        </div>
      </Modal>
    );
  }

  // ── Success state ──
  if (done) {
    const selectedPackageName = packages.find((p) => p.name === selectedPkg)?.name;
    const timeLabel = formatTimeLabel(time);
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
          {renderStepRail(5)}
          <section className="booking-numbered-group booking-numbered-group--success" aria-labelledby="booking-confirmation-title">
            <header className="booking-numbered-group-heading">
              <span className="booking-group-index">05</span>
              <h2 id="booking-confirmation-title">{t("bookingModal.successTitle")}</h2>
            </header>
            <div className="booking-modal-success">
          <div className="booking-success-check">
            <svg viewBox="0 0 24 24" className="booking-success-check-svg" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

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

          <p className="booking-success-next">
            {accountLinked
              ? t("bookingModal.nextStepLinked", "I'll review your booking and confirm via your contact info within 24 hours. This request is linked to your account.")
              : t("bookingModal.nextStepContact", "I'll review your booking and confirm via your contact info within 24 hours.")}
          </p>
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
          {renderSuccessBridge(
            showDashboard
              ? t("bookingModal.successBridgeDashboardDetail", "This booking request is linked to your signed-in account. View booking, date, and deposit updates in your dashboard.")
              : t("bookingModal.successBridgeContactDetail", "Updates will go to the contact details you provided. Message me if anything changes."),
            { showDashboard },
          )}
            </div>
          </section>
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
      typewriter={false}
      maskClosable={false}
      footer={null}
    >
      <span id={descriptionId} className="sr-only">{t("bookingModal.subtitle")}</span>
      <div ref={contentRef} className="booking-modal-content">
        <div className="booking-modal-heading">
          <h2 id={titleId}>{t("bookingModal.title")}</h2>
          <button
            type="button"
            className="booking-modal-close"
            onClick={onClose}
            aria-label={t("bookingModal.cancel")}
            title={t("bookingModal.cancel")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="booking-subtitle">
          {t("bookingModal.subtitle")}
        </p>

        {renderStepRail(step === 1 ? 1 : 3)}

        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="booking-error" role="alert">{error}</p>}

          {/* Step 1: Session details */}
          {step === 1 && (
            <div className="booking-step-content">
              <section className="booking-numbered-group" aria-labelledby="booking-package-heading">
                <header className="booking-numbered-group-heading">
                  <span className="booking-group-index">01</span>
                  <h3 id="booking-package-heading">{t("bookingModal.selectPackage")}</h3>
                </header>
                <div className="booking-field">
                  <label htmlFor="booking-package">{t("bookingModal.selectPackage")}</label>
                  <select id="booking-package" value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)}>
                    <option value="">{t("bookingModal.anyPackage")}</option>
                    {packageOptions}
                  </select>
                </div>
              </section>

              <section className="booking-numbered-group" aria-labelledby="booking-schedule-heading">
                <header className="booking-numbered-group-heading">
                  <span className="booking-group-index">02</span>
                  <h3 id="booking-schedule-heading">{t("bookingModal.date")} / {t("bookingModal.time")}</h3>
                </header>
                <div className={`booking-field ${errors.date && touched.date ? "has-error" : ""}`}>
                  <label>{t("bookingModal.date")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
                  <BookingCalendar
                    selectedDate={date}
                    onSelectDate={handleDateSelect}
                    onRequestWaitlist={handleWaitlistDate}
                    onSelectedDateInfoChange={handleSelectedDateInfoChange}
                    minDate={earliestBookingDate}
                    policyTimeZone={bookingPolicy.timeZone}
                    capacityPerDay={bookingPolicy.capacityPerDay}
                  />
                  {errors.date && touched.date && (
                    <span className="booking-field-error">{errors.date}</span>
                  )}
                </div>

                <BookingTimeSlotPicker
                  id="booking-time"
                  label={t("bookingModal.time")}
                  optionalLabel={t("bookingModal.any")}
                  value={time}
                  onChange={handleTimeChange}
                  dateInfo={selectedDateAvailability}
                  hint={t("bookingModal.timeSlotLimitedHint", "Choose an available window or leave Any if you can be flexible.")}
                  error={errors.time && touched.time ? errors.time : undefined}
                />
              </section>

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
                <ChevronLeft size={16} aria-hidden="true" />
                {t("bookingModal.back", "Back")}
              </button>

              <section className="booking-numbered-group" aria-labelledby="booking-contact-heading">
                <header className="booking-numbered-group-heading">
                  <span className="booking-group-index">03</span>
                  <h3 id="booking-contact-heading">{t("bookingModal.contact")}</h3>
                </header>

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

              </section>

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
