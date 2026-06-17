import { Button, Input, Modal } from "animal-island-ui";
import { type FormEvent, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../hooks/useSiteContent";
import { useNotification } from "../hooks/useNotification";
import { PaymentForm } from "./PaymentForm";
import { BookingCalendar } from "./BookingCalendar";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { getApiError, readJsonResponse } from "../lib/http";

type BookingModalProps = {
  initialPackage?: string;
  onClose: () => void;
};

type FormErrors = {
  name?: string;
  contact?: string;
  date?: string;
};

export function BookingModal({ initialPackage, onClose }: BookingModalProps) {
  const { t } = useTranslation();
  const { packages, siteConfig } = useSiteContent();
  const { sendBookingConfirmation, sending: notificationSending } = useNotification();
  const [selectedPkg, setSelectedPkg] = useState(initialPackage || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
        // Date is optional, no validation needed
        return undefined;
      default:
        return undefined;
    }
  }, [t]);

  const handleBlur = useCallback((field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, [validateField]);

  const handleChange = useCallback((field: string, value: string) => {
    if (field === "name") setName(value);
    else if (field === "contact") setContact(value);

    // Only validate if field has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  }, [touched, validateField]);

  const isFormValid = name.trim().length >= 2 && contact.trim().length >= 5;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate all fields
    const nameError = validateField("name", name);
    const contactError = validateField("contact", contact);
    setErrors({ name: nameError, contact: contactError });
    setTouched({ name: true, contact: true });

    if (nameError || contactError) return;

    const trimmedName = name.trim().slice(0, 50);
    const trimmedContact = contact.trim().slice(0, 100);
    const trimmedNotes = notes.trim().slice(0, 500);

    setSending(true);
    setError("");

    try {
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
        throw new Error(getApiError(data, t("bookingModal.submitError")));
      }

      const data = await readJsonResponse<{ id?: string }>(r);
      if (!data?.id) throw new Error(t("bookingModal.submitError"));
      setBookingId(data.id);
      setShowPayment(true);

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

  // Calculate deposit based on selected package (30% of minimum price, min 2000 cents)
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

  // ── Payment step ──
  if (showPayment && bookingId) {
    return (
      <Modal open onClose={onClose} footer={null} typewriter={false}>
        <PaymentForm
          purpose="booking_deposit"
          amountCents={calculateDepositCents()}
          currency="cny"
          referenceId={bookingId}
          metadata={{ packageName: selectedPkg, name: name.trim() }}
          onSuccess={() => {
            setDone(true);
            setShowPayment(false);
          }}
          onError={(err) => {
            setError(err);
            setShowPayment(false);
          }}
          onCancel={() => {
            setDone(true);
            setShowPayment(false);
          }}
        />
      </Modal>
    );
  }

  // ── Success state ──
  if (done) {
    const selectedPackageName = packages.find((p) => p.name === selectedPkg)?.name;
    const timeLabel: string = time ? String(t(`bookingModal.${time}` as any)) : String(t("bookingModal.any"));
    return (
      <Modal open onClose={onClose} footer={null} typewriter={false}>
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
          <p className="booking-success-hint">{t("bookingModal.success")} {siteConfig.xiaohongshuProfile}</p>

          <div className="booking-success-actions">
            <Button type="primary" onClick={onClose}>{t("bookingModal.gotIt")}</Button>
            <Link
              to="/dashboard"
              className="booking-success-dashboard-btn"
              onClick={onClose}
            >
              {t("bookingModal.viewDashboard")}
            </Link>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Form state ──
  return (
    <Modal
      open
      onClose={onClose}
      title={t("bookingModal.title")}
      typewriter={false}
      maskClosable={false}
      footer={null}
    >
      <p className="booking-subtitle">
        {t("bookingModal.subtitle")}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="booking-field">
          <label htmlFor="booking-package">{t("bookingModal.selectPackage")}</label>
          <select id="booking-package" value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)}>
            <option value="">{t("bookingModal.anyPackage")}</option>
            {packageOptions}
          </select>
        </div>

        <div className="booking-field">
          <label>{t("bookingModal.date")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
          <BookingCalendar
            selectedDate={date}
            onSelectDate={setDate}
            minDate={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="booking-row">
          <div className="booking-field">
            <label htmlFor="booking-time">{t("bookingModal.time")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
            <select id="booking-time" value={time} onChange={(e) => setTime(e.target.value)}>
              <option value="">{t("bookingModal.any")}</option>
              <option value="morning">{t("bookingModal.morning")}</option>
              <option value="afternoon">{t("bookingModal.afternoon")}</option>
              <option value="fullDay">{t("bookingModal.fullDay")}</option>
            </select>
          </div>
        </div>

        <div className={`booking-field ${errors.name && touched.name ? "has-error" : ""}`}>
          <label htmlFor="booking-name">{t("bookingModal.name")} <span className="booking-required">*</span></label>
          <Input
            id="booking-name"
            value={name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name", name)}
            placeholder={t("bookingModal.namePlaceholder")}
            required
            shadow
          />
          {errors.name && touched.name && (
            <span className="booking-field-error">{errors.name}</span>
          )}
        </div>

        <div className={`booking-field ${errors.contact && touched.contact ? "has-error" : ""}`}>
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
          <Button type="default" onClick={onClose}>{t("bookingModal.cancel")}</Button>
          <Button type="primary" htmlType="submit" disabled={sending || !isFormValid}>
            {sending ? (
              <span className="booking-btn-loading">
                <span className="booking-btn-spinner" />
                {t("bookingModal.submitting")}
              </span>
            ) : t("bookingModal.submit")}
          </Button>
        </div>

        <p className="booking-footer">
          {t("bookingModal.agreement")}
          <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">{t("bookingModal.contact")}</a>
        </p>
      </form>
    </Modal>
  );
}
