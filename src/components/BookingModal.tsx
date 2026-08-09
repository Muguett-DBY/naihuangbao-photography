import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BookingStepRail } from "../features/booking/BookingStepRail";
import { BookingFormSteps, type BookingFormErrors } from "../features/booking/BookingFormSteps";
import { BookingPaymentView, BookingSuccessView, WaitlistOutcomeView } from "../features/booking/BookingOutcomeViews";
import { useBookingPolicy } from "../hooks/useBookingPolicy";
import { useNotification } from "../hooks/useNotification";
import { useSiteContent } from "../hooks/useSiteContent";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { getApiError, readJsonResponse } from "../lib/http";
import { isBookableBusinessDate, isRealDateKey } from "../utils/businessDate";
import { savePendingBooking } from "../utils/offlineBooking";
import { track } from "../utils/track";
import { type DateInfo } from "./BookingCalendar";
import { isBookingTimeSlotUnavailable } from "./BookingTimeSlotPicker";
import { Modal } from "./ui/Modal";

type BookingModalProps = {
  initialPackage?: string;
  onClose: () => void;
};

type WaitlistResponse = {
  accountLinked?: boolean;
  message?: string;
  waitlist?: { id?: string; duplicate?: boolean };
};

type BookingSubmitErrorResponse = {
  error?: string;
  message?: string;
  timeSlots?: DateInfo["timeSlots"];
  recovery?: {
    canKeepDate?: boolean;
    requestedTime?: string;
    suggestedTime?: string;
    availableTimeSlots?: string[];
  };
};

type BookingSubmitResponse = {
  id?: string;
  accountLinked?: boolean;
};

export function BookingModal({ initialPackage, onClose }: BookingModalProps) {
  const { t } = useTranslation();
  const { packages, siteConfig } = useSiteContent();
  const { sendBookingConfirmation } = useNotification();
  const { policy: bookingPolicy } = useBookingPolicy();
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
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const titleId = useId();
  const descriptionId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  const isSelectedTimeUnavailable = useCallback((value: string) => isBookingTimeSlotUnavailable(selectedDateAvailability, value), [selectedDateAvailability]);
  const formatTimeLabel = useCallback((value: string) => value ? String(t(`bookingModal.${value}` as never)) : String(t("bookingModal.any")), [t]);
  const validateField = useCallback((field: string, value: string): string | undefined => {
    if (field === "name") {
      if (!value.trim()) return t("bookingModal.nameRequired", "Please enter your name");
      if (value.trim().length < 2) return t("bookingModal.nameTooShort", "Name must be at least 2 characters");
    }
    if (field === "contact") {
      if (!value.trim()) return t("bookingModal.contactRequired", "Please enter your contact");
      if (value.trim().length < 5) return t("bookingModal.contactTooShort", "Contact must be at least 5 characters");
    }
    if (field === "date" && value) {
      if (!isRealDateKey(value)) return t("bookingModal.dateInvalid", "Please choose a valid date");
      if (!isBookableBusinessDate(value, bookingPolicy.earliestDate)) return t("bookingModal.datePast", { date: bookingPolicy.earliestDate, defaultValue: "Please choose {{date}} or later" });
    }
    if (field === "time" && isSelectedTimeUnavailable(value)) return t("bookingModal.timeUnavailable", "This time window is already unavailable for the selected date.");
    return undefined;
  }, [bookingPolicy.earliestDate, isSelectedTimeUnavailable, t]);

  useEffect(() => {
    if (!time || !isSelectedTimeUnavailable(time)) return;
    setTime("");
    setErrors((current) => ({ ...current, time: t("bookingModal.timeSlotClearNotice", "That time was unavailable for this date, so I cleared it.") }));
  }, [isSelectedTimeUnavailable, t, time]);

  useEffect(() => {
    const rail = contentRef.current?.querySelector<HTMLOListElement>(".booking-step-rail");
    const current = rail?.querySelector<HTMLElement>("[aria-current='step']");
    if (!rail || !current || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollTo({ left: Math.max(0, current.offsetLeft - ((rail.clientWidth - current.offsetWidth) / 2)), behavior: "auto" });
  }, [bookingId, done, showPayment, step, waitlistDone]);

  const handleBlur = useCallback((field: "name" | "contact", value: string) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
  }, [validateField]);

  const handleChange = useCallback((field: "name" | "contact" | "date", value: string) => {
    if (field === "name") setName(value);
    if (field === "contact") setContact(value);
    if (field === "date") setDate(value);
    if (touched[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
  }, [touched, validateField]);

  const handleDateSelect = useCallback((nextDate: string) => {
    setWaitlistDate("");
    setRecoveredDateAvailability(null);
    handleChange("date", nextDate);
    setTouched((current) => ({ ...current, date: true }));
    setErrors((current) => ({ ...current, date: validateField("date", nextDate) }));
  }, [handleChange, validateField]);

  const handleSelectedDateInfoChange = useCallback((info: DateInfo | null) => {
    setSelectedDateAvailability(recoveredDateAvailability?.date === date ? recoveredDateAvailability.info : info);
  }, [date, recoveredDateAvailability]);

  const handleTimeChange = useCallback((nextTime: string) => {
    setTime(nextTime);
    setTouched((current) => ({ ...current, time: true }));
    setErrors((current) => ({ ...current, time: validateField("time", nextTime) }));
  }, [validateField]);

  const handleWaitlistDate = useCallback((nextDate: string) => {
    setDate(nextDate);
    setWaitlistDate(nextDate);
    setRecoveredDateAvailability(null);
    setWaitlistAlreadyJoined(false);
    setAccountLinked(false);
    setTouched((current) => ({ ...current, date: true }));
    setErrors((current) => ({ ...current, date: validateField("date", nextDate) }));
    setStep(2);
    setError("");
    track("booking_waitlist_started", { packageName: selectedPkg, date: nextDate });
  }, [selectedPkg, validateField]);

  const handleNext = useCallback(() => {
    const dateError = validateField("date", date);
    const timeError = validateField("time", time);
    setErrors((current) => ({ ...current, date: dateError, time: timeError }));
    setTouched((current) => ({ ...current, date: true, time: true }));
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
        body: JSON.stringify({ preferredDate, packageName: selectedPkg, name: trimmedName, contact: trimmedContact }),
      });
      const data = await readJsonResponse<WaitlistResponse>(response);
      if (!response.ok) throw new Error(getApiError(data, t("bookingModal.waitlistSubmitError")));
      const alreadyJoined = data?.message === "already_waitlisted" || data?.waitlist?.duplicate === true;
      setWaitlistId(data?.waitlist?.id ?? null);
      setWaitlistAlreadyJoined(alreadyJoined);
      setAccountLinked(data?.accountLinked === true);
      setWaitlistDone(true);
      track(alreadyJoined ? "booking_waitlist_duplicate" : "booking_waitlist_joined", { packageName: selectedPkg, date: preferredDate });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("bookingModal.waitlistSubmitError"));
    } finally {
      setJoiningWaitlist(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAccountLinked(false);
    const nextErrors: BookingFormErrors = {
      name: validateField("name", name),
      contact: validateField("contact", contact),
      date: validateField("date", date),
      time: validateField("time", time),
    };
    setErrors(nextErrors);
    setTouched({ name: true, contact: true, date: true, time: true });
    if (Object.values(nextErrors).some(Boolean)) return;
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
      if (!navigator.onLine) {
        const offlineId = await savePendingBooking({ packageName: selectedPkg, preferredDate: date, preferredTime: time, name: trimmedName, contact: trimmedContact, notes: trimmedNotes });
        if (!offlineId) throw new Error(t("bookingModal.offlineSaveError", "This booking could not be saved on this device. Please reconnect and try again."));
        setBookingId(offlineId);
        setSavedOffline(true);
        setDepositOutcome("offline");
        setDone(true);
        track("booking_offline_saved", { packageName: selectedPkg, bookingId: offlineId });
        return;
      }
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({ packageName: selectedPkg, preferredDate: date, preferredTime: time, name: trimmedName, contact: trimmedContact, notes: trimmedNotes }),
      });
      if (!response.ok) {
        const data = await readJsonResponse<BookingSubmitErrorResponse>(response);
        if (data?.error === "fully_booked" && date) {
          setWaitlistDate(date);
          setError(t("bookingModal.fullDateWaitlistPrompt"));
          return;
        }
        if (data?.error === "time_unavailable") {
          const availability: DateInfo = {
            status: selectedDateAvailability?.status ?? "partial",
            count: selectedDateAvailability?.count ?? 0,
            capacity: selectedDateAvailability?.capacity,
            remaining: selectedDateAvailability?.remaining,
            timeSlots: data.timeSlots,
          };
          setRecoveredDateAvailability({ date, info: availability });
          setSelectedDateAvailability(availability);
          const suggestedTime = data.recovery?.suggestedTime ?? "";
          setTime(suggestedTime);
          setTouched((current) => ({ ...current, time: true }));
          setErrors((current) => ({ ...current, time: suggestedTime ? undefined : t("bookingModal.timeUnavailable") }));
          setStep(1);
          setError(suggestedTime ? t("bookingModal.timeSlotRecoveryHint", { time: formatTimeLabel(suggestedTime) }) : t("bookingModal.timeUnavailable"));
          return;
        }
        throw new Error(getApiError(data, t("bookingModal.submitError")));
      }
      const data = await readJsonResponse<BookingSubmitResponse>(response);
      if (!data?.id) throw new Error(t("bookingModal.submitError"));
      setBookingId(data.id);
      setAccountLinked(data.accountLinked === true);
      setShowPayment(true);
      track("booking_submitted", { packageName: selectedPkg, bookingId: data.id, hasNotes: Boolean(trimmedNotes) });
      await sendBookingConfirmation(trimmedContact, { bookingId: data.id, packageName: selectedPkg, preferredDate: date, preferredTime: time, name: trimmedName });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("bookingModal.submitError"));
    } finally {
      setSending(false);
    }
  }

  const selectedPackageName = packages.find((item) => item.name === selectedPkg)?.name || selectedPkg;
  const calculateDepositCents = () => {
    const price = packages.find((item) => item.name === selectedPkg)?.price;
    const hourlyRate = Number.parseFloat(price?.match(/(\d+(?:\.\d+)?)/)?.[1] || "0");
    return Math.max(Math.round(hourlyRate * 2 * 0.3 * 100), 2000);
  };

  if (waitlistDone) return <WaitlistOutcomeView onClose={onClose} titleId={titleId} contentRef={contentRef} alreadyJoined={waitlistAlreadyJoined} waitlistId={waitlistId} date={waitlistDate || date} packageName={selectedPackageName} accountLinked={accountLinked} profileUrl={siteConfig.xiaohongshuProfile} />;
  if (showPayment && bookingId) return <BookingPaymentView onClose={onClose} titleId={titleId} contentRef={contentRef} amountCents={calculateDepositCents()} bookingId={bookingId} packageName={selectedPkg} name={name.trim()} onSuccess={() => { setDepositOutcome(null); setDone(true); setShowPayment(false); }} onPending={() => { setDepositOutcome("pending"); setDone(true); setShowPayment(false); }} onError={(message) => { setError(message); setShowPayment(false); }} onCancel={() => { setDepositOutcome("deferred"); setDone(true); setShowPayment(false); }} />;
  if (done) return <BookingSuccessView onClose={onClose} titleId={titleId} contentRef={contentRef} bookingId={bookingId} packageName={selectedPackageName || undefined} date={date} timeLabel={formatTimeLabel(time)} accountLinked={accountLinked} depositOutcome={depositOutcome} savedOffline={savedOffline} profileUrl={siteConfig.xiaohongshuProfile} />;

  const isWaitlistMode = Boolean(waitlistDate);
  const actionBusy = sending || joiningWaitlist;
  return (
    <Modal open onClose={onClose} maskClosable={false} footer={null} aria-labelledby={titleId} aria-describedby={descriptionId}>
      <span id={descriptionId} className="sr-only">{t("bookingModal.subtitle")}</span>
      <div ref={contentRef} className="booking-modal-content">
        <div className="booking-modal-heading">
          <h2 id={titleId}>{t("bookingModal.title")}</h2>
          <button type="button" className="booking-modal-close" onClick={onClose} aria-label={t("bookingModal.cancel")} title={t("bookingModal.cancel")}><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="booking-subtitle">{t("bookingModal.subtitle")}</p>
        <BookingStepRail currentStage={step === 1 ? 1 : 3} />
        <BookingFormSteps
          step={step}
          error={error}
          packageOptions={packages.map((item) => <option key={item.name} value={item.name}>{item.name} — {item.price}</option>)}
          selectedPackage={selectedPkg}
          date={date}
          time={time}
          selectedDateAvailability={selectedDateAvailability}
          earliestBookingDate={bookingPolicy.earliestDate}
          policyTimeZone={bookingPolicy.timeZone}
          capacityPerDay={bookingPolicy.capacityPerDay}
          errors={errors}
          touched={touched}
          waitlistDate={waitlistDate}
          name={name}
          contact={contact}
          notes={notes}
          actionBusy={actionBusy}
          actionLabel={isWaitlistMode ? t("bookingModal.joinWaitlist") : t("bookingModal.submit")}
          busyLabel={isWaitlistMode ? t("bookingModal.joiningWaitlist") : t("bookingModal.submitting")}
          isFormValid={name.trim().length >= 2 && contact.trim().length >= 5}
          profileUrl={siteConfig.xiaohongshuProfile}
          onSubmit={handleSubmit}
          onPackageChange={setSelectedPkg}
          onDateSelect={handleDateSelect}
          onWaitlistDate={handleWaitlistDate}
          onDateInfoChange={handleSelectedDateInfoChange}
          onTimeChange={handleTimeChange}
          onFieldChange={handleChange}
          onFieldBlur={handleBlur}
          onNotesChange={setNotes}
          onCancel={onClose}
          onNext={handleNext}
          onBack={handleBack}
        />
      </div>
    </Modal>
  );
}
