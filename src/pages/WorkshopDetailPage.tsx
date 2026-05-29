import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users, Clock, CheckCircle } from "lucide-react";
import { Button } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { getTitle, getDesc } from "../lib/i18n-helpers";
import { PaymentForm } from "../components/PaymentForm";
import type { Workshop } from "../types/content";

export function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/workshops/${id}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { workshop: Workshop }) => {
        if (!ctrl.signal.aborted) {
          if (!d.workshop) setError("not found");
          else setWorkshop(d.workshop);
        }
      })
      .catch(() => { if (!ctrl.signal.aborted) setError(t("common.loading")); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id]);

  const handleRegister = async () => {
    if (!formName.trim()) { setFormMsg(t("workshops.form.nameRequired")); return; }
    if (!formContact.trim()) { setFormMsg(t("workshops.form.contactRequired")); return; }
    setSubmitting(true);
    setFormMsg("");
    try {
      const r = await fetch(`/api/workshops/${id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), contact: formContact.trim(), participants: 1 }),
      });
      if (r.ok) {
        const data = await r.json() as { id: string };
        setRegistrationId(data.id);

        if (workshop?.price_cents && workshop.price_cents > 0) {
          setShowPayment(true);
          setSubmitting(false);
          return;
        }

        setFormMsg(t("workshops.form.success"));
        setFormName("");
        setFormContact("");
        if (workshop) setWorkshop({ ...workshop, current_participants: workshop.current_participants + 1 });
      } else {
        const d = await r.json().catch(() => ({}));
        setFormMsg(d.error || t("workshops.form.error"));
      }
    } catch {
      setFormMsg(t("workshops.form.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !workshop) return <DetailNotFound message={t("workshopDetail.notFound")} backTo="/workshops" backLabel={t("workshopDetail.backToList")} />;

  const spotsLeft = (workshop.max_participants || 0) - workshop.current_participants;
  const isFull = spotsLeft <= 0;

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading workshop-detail-hero-heading">
          <DetailBackLink to="/workshops" label={t("workshopDetail.backToList")} />
          <h1>{getTitle(workshop, lang)}</h1>
          <div className="workshop-detail-meta">
            <span>
              <Calendar size={14} /> {workshop.event_date} {workshop.event_time}
            </span>
            {workshop.location && (
              <span>
                <MapPin size={14} /> {workshop.location}
              </span>
            )}
            <span style={{ color: isFull ? "#ef4444" : undefined }}>
              <Users size={14} /> {isFull ? t("workshops.full") : `${t("workshops.spotsLeft")}: ${spotsLeft}`}
            </span>
          </div>
        </div>
      </section>

      {workshop.cover_image_url && (
        <section className="section-shell is-visible" style={{ paddingTop: 0 }}>
          <img src={workshop.cover_image_url} alt={getTitle(workshop, lang)} width={800} height={400} loading="lazy" className="workshop-detail-cover" />
        </section>
      )}

      <section className="section-shell is-visible">
        <div className="workshop-detail-section">
          <h2>{t("workshopDetail.about")}</h2>
          <p className="workshop-detail-description">{getDesc(workshop, lang)}</p>
        </div>
      </section>

      <section className="section-shell is-visible">
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

      <section className="section-shell is-visible">
        <div className="workshop-detail-section">
          <h2>{t("workshopDetail.guide")}</h2>
          <div className="workshop-detail-guide-grid">
            {[
              { title: t("workshopDetail.gearTitle"), items: ["相机+镜头", "备用电池", "存储卡", "三脚架（可选）"] },
              { title: t("workshopDetail.clothingTitle"), items: ["舒适运动鞋", "防晒帽", "深色衣物为佳", "备一件外套"] },
              { title: t("workshopDetail.tipsTitle"), items: ["提前到场", "手机充电", "保持开放心态", "享受拍摄过程"] },
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
        <section className="section-shell is-visible">
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

      <section className="section-shell is-visible">
        <div className="workshop-detail-section">
          <h2>{t("workshopDetail.register")}</h2>
          <div className="workshop-detail-register-card">
            {workshop.price_display && <div className="workshop-detail-register-price">{workshop.price_display}</div>}
            {isFull ? (
              <p className="workshop-detail-register-full">{t("workshopDetail.fullMessage")}</p>
            ) : showPayment && registrationId && workshop?.price_cents ? (
              <PaymentForm
                purpose="workshop_registration"
                amountCents={workshop.price_cents}
                currency={workshop.currency || "usd"}
                referenceId={registrationId}
                metadata={{ workshopTitle: getTitle(workshop, lang), name: formName.trim() }}
                onSuccess={() => {
                  setFormMsg(t("workshops.form.success"));
                  setShowPayment(false);
                  setFormName("");
                  setFormContact("");
                  if (workshop) setWorkshop({ ...workshop, current_participants: workshop.current_participants + 1 });
                }}
                onError={() => {}}
                onCancel={() => setShowPayment(false)}
              />
            ) : (
              <>
                <input
                  value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("workshops.form.name")}
                  className="workshop-detail-register-input"
                />
                <input
                  value={formContact} onChange={(e) => setFormContact(e.target.value)}
                  placeholder={t("workshops.form.contact")}
                  className="workshop-detail-register-input"
                />
                {formMsg && <p className={`workshop-detail-form-msg${formMsg === t("workshops.form.success") ? " workshop-detail-form-msg--success" : " workshop-detail-form-msg--error"}`}>{formMsg}</p>}
                <Button type="primary" onClick={handleRegister} disabled={submitting}>
                  {submitting ? t("workshops.form.submitting") : t("workshops.register")}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
