import { Button, Input } from "animal-island-ui";
import type { FormEventHandler, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BookingCalendar, type DateInfo } from "../../components/BookingCalendar";
import { BookingTimeSlotPicker } from "../../components/BookingTimeSlotPicker";

export type BookingFormErrors = {
  name?: string;
  contact?: string;
  date?: string;
  time?: string;
};

type BookingFormStepsProps = {
  step: 1 | 2;
  error: string;
  packageOptions: ReactNode;
  selectedPackage: string;
  date: string;
  time: string;
  selectedDateAvailability: DateInfo | null;
  earliestBookingDate: string;
  policyTimeZone: string;
  capacityPerDay: number;
  errors: BookingFormErrors;
  touched: Record<string, boolean>;
  waitlistDate: string;
  name: string;
  contact: string;
  notes: string;
  actionBusy: boolean;
  actionLabel: string;
  busyLabel: string;
  isFormValid: boolean;
  profileUrl: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onPackageChange: (value: string) => void;
  onDateSelect: (value: string) => void;
  onWaitlistDate: (value: string) => void;
  onDateInfoChange: (value: DateInfo | null) => void;
  onTimeChange: (value: string) => void;
  onFieldChange: (field: "name" | "contact", value: string) => void;
  onFieldBlur: (field: "name" | "contact", value: string) => void;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  onNext: () => void;
  onBack: () => void;
};

export function BookingFormSteps(props: BookingFormStepsProps) {
  const { t } = useTranslation();
  return (
    <form onSubmit={props.onSubmit} noValidate>
      {props.error && <p className="booking-error" role="alert">{props.error}</p>}
      {props.step === 1 && (
        <div className="booking-step-content">
          <section className="booking-numbered-group" aria-labelledby="booking-package-heading">
            <header className="booking-numbered-group-heading">
              <span className="booking-group-index">01</span>
              <h3 id="booking-package-heading">{t("bookingModal.selectPackage")}</h3>
            </header>
            <div className="booking-field">
              <label htmlFor="booking-package">{t("bookingModal.selectPackage")}</label>
              <select id="booking-package" value={props.selectedPackage} onChange={(event) => props.onPackageChange(event.target.value)}>
                <option value="">{t("bookingModal.anyPackage")}</option>
                {props.packageOptions}
              </select>
            </div>
          </section>
          <section className="booking-numbered-group" aria-labelledby="booking-schedule-heading">
            <header className="booking-numbered-group-heading">
              <span className="booking-group-index">02</span>
              <h3 id="booking-schedule-heading">{t("bookingModal.date")} / {t("bookingModal.time")}</h3>
            </header>
            <div className={`booking-field ${props.errors.date && props.touched.date ? "has-error" : ""}`}>
              <label>{t("bookingModal.date")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
              <BookingCalendar
                selectedDate={props.date}
                onSelectDate={props.onDateSelect}
                onRequestWaitlist={props.onWaitlistDate}
                onSelectedDateInfoChange={props.onDateInfoChange}
                minDate={props.earliestBookingDate}
                policyTimeZone={props.policyTimeZone}
                capacityPerDay={props.capacityPerDay}
              />
              {props.errors.date && props.touched.date && <span className="booking-field-error">{props.errors.date}</span>}
            </div>
            <BookingTimeSlotPicker
              id="booking-time"
              label={t("bookingModal.time")}
              optionalLabel={t("bookingModal.any")}
              value={props.time}
              onChange={props.onTimeChange}
              dateInfo={props.selectedDateAvailability}
              hint={t("bookingModal.timeSlotLimitedHint", "Choose an available window or leave Any if you can be flexible.")}
              error={props.errors.time && props.touched.time ? props.errors.time : undefined}
            />
          </section>
          <div className="booking-actions">
            <Button type="default" onClick={props.onCancel}>{t("bookingModal.cancel")}</Button>
            <Button type="primary" onClick={props.onNext}>{t("bookingModal.next", "Next")}</Button>
          </div>
        </div>
      )}

      {props.step === 2 && (
        <div className="booking-step-content">
          <button type="button" className="booking-back-btn" onClick={props.onBack}><ChevronLeft size={16} aria-hidden="true" />{t("bookingModal.back", "Back")}</button>
          <section className="booking-numbered-group" aria-labelledby="booking-contact-heading">
            <header className="booking-numbered-group-heading">
              <span className="booking-group-index">03</span>
              <h3 id="booking-contact-heading">{t("bookingModal.contact")}</h3>
            </header>
            {props.waitlistDate && <div className="booking-waitlist-notice" role="status"><strong>{t("bookingModal.waitlistNoticeTitle")}</strong><span>{t("bookingModal.waitlistNoticeDescription", { date: props.waitlistDate })}</span></div>}
            <div className={`booking-field ${props.errors.name && props.touched.name ? "has-error" : ""} ${props.touched.name && !props.errors.name && props.name.trim().length >= 2 ? "is-valid" : ""}`}>
              <label htmlFor="booking-name">{t("bookingModal.name")} <span className="booking-required">*</span></label>
              <Input id="booking-name" value={props.name} onChange={(event) => props.onFieldChange("name", event.target.value)} onBlur={() => props.onFieldBlur("name", props.name)} placeholder={t("bookingModal.namePlaceholder")} maxLength={50} required shadow />
              <div className="booking-field-extra"><span className="booking-field-count">{props.name.length}/50</span></div>
              {props.errors.name && props.touched.name && <span className="booking-field-error">{props.errors.name}</span>}
            </div>
            <div className={`booking-field ${props.errors.contact && props.touched.contact ? "has-error" : ""} ${props.touched.contact && !props.errors.contact && props.contact.trim().length >= 5 ? "is-valid" : ""}`}>
              <label htmlFor="booking-contact">{t("bookingModal.contact")} <span className="booking-required">*</span></label>
              <Input id="booking-contact" value={props.contact} onChange={(event) => props.onFieldChange("contact", event.target.value)} onBlur={() => props.onFieldBlur("contact", props.contact)} placeholder={t("bookingModal.contactPlaceholder")} required shadow />
              {props.errors.contact && props.touched.contact && <span className="booking-field-error">{props.errors.contact}</span>}
            </div>
            <div className="booking-field">
              <label htmlFor="booking-notes">{t("bookingModal.message")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
              <textarea id="booking-notes" className="booking-textarea" value={props.notes} onChange={(event) => props.onNotesChange(event.target.value)} placeholder={t("bookingModal.messagePlaceholder")} rows={3} />
            </div>
          </section>
          <div className="booking-actions">
            <Button type="default" onClick={props.onBack}>{t("bookingModal.back", "Back")}</Button>
            <Button type="primary" htmlType="submit" disabled={props.actionBusy || !props.isFormValid}>
              {props.actionBusy ? <span className="booking-btn-loading"><span className="booking-btn-spinner" />{props.busyLabel}</span> : props.actionLabel}
            </Button>
          </div>
          <p className="booking-footer">{t("bookingModal.agreement")}<a href={props.profileUrl} target="_blank" rel="noreferrer">{t("bookingModal.contact")}</a></p>
        </div>
      )}
    </form>
  );
}
