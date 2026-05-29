import { Button, Input, Modal } from "animal-island-ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../hooks/useSiteContent";

type BookingModalProps = {
  initialPackage?: string;
  onClose: () => void;
};

export function BookingModal({ initialPackage, onClose }: BookingModalProps) {
  const { t } = useTranslation();
  const { packages, siteConfig } = useSiteContent();
  const [selectedPkg, setSelectedPkg] = useState(initialPackage || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    setSending(true);
    setError("");

    try {
      const r = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packageName: selectedPkg,
          preferredDate: date,
          preferredTime: time,
          name: name.trim(),
          contact: contact.trim(),
          notes: notes.trim(),
        }),
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || t("bookingModal.submitError"));
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookingModal.submitError"));
    } finally {
      setSending(false);
    }
  }

  const packageOptions = packages.map((p) => (
    <option key={p.name} value={p.name}>{p.name} — {p.price}</option>
  ));

  // ── Success state ──
  if (done) {
    return (
      <Modal open onClose={onClose} footer={null} typewriter={false}>
        <div className="booking-modal-success">
          <h2>{t("bookingModal.successTitle")}</h2>
          <p>{t("bookingModal.successHint")}</p>
          <p className="booking-success-hint">{t("bookingModal.success")} {siteConfig.xiaohongshuProfile}</p>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Button type="primary" onClick={onClose}>{t("bookingModal.gotIt")}</Button>
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
      <p style={{ margin: "0 0 16px", color: "var(--animal-text-color-secondary)", fontSize: 14 }}>
        {t("bookingModal.subtitle")}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="booking-field">
          <label>{t("bookingModal.selectPackage")}</label>
          <select value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)} aria-label={t("bookingModal.selectPackage")}>
            <option value="">{t("bookingModal.anyPackage")}</option>
            {packageOptions}
          </select>
        </div>

        <div className="booking-row">
          <div className="booking-field">
            <label>{t("bookingModal.date")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
          </div>
          <div className="booking-field">
            <label>{t("bookingModal.time")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
            <select value={time} onChange={(e) => setTime(e.target.value)} aria-label={t("bookingModal.time")}>
              <option value="">{t("bookingModal.any")}</option>
              <option value="morning">{t("bookingModal.morning")}</option>
              <option value="afternoon">{t("bookingModal.afternoon")}</option>
              <option value="fullDay">{t("bookingModal.fullDay")}</option>
            </select>
          </div>
        </div>

        <div className="booking-field">
          <label>{t("bookingModal.name")} <span className="booking-required">*</span></label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("bookingModal.namePlaceholder")}
            required
            shadow
          />
        </div>

        <div className="booking-field">
          <label>{t("bookingModal.contact")} <span className="booking-required">*</span></label>
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t("bookingModal.contactPlaceholder")}
            required
            shadow
          />
        </div>

        <div className="booking-field">
          <label>{t("bookingModal.message")} <span className="booking-optional">{t("bookingModal.any")}</span></label>
          <textarea
            className="booking-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("bookingModal.messagePlaceholder")}
            rows={3}
            aria-label={t("bookingModal.message")}
          />
        </div>

        {error ? <p className="booking-error">{error}</p> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button type="default" onClick={onClose}>{t("bookingModal.cancel")}</Button>
          <Button type="primary" htmlType="submit" disabled={sending || !name.trim() || !contact.trim()}>
            {sending ? t("bookingModal.submitting") : t("bookingModal.submit")}
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
