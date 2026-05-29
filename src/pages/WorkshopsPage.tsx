import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button, Input } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useNotification } from "../hooks/useNotification";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { WorkshopCountdown } from "../components/WorkshopCountdown";
import { CapacityBar } from "../components/CapacityBar";
import { getTitle, getDesc } from "../lib/i18n-helpers";
import type { Workshop } from "../types/content";

export function WorkshopsPage() {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { sendWorkshopRegistration } = useNotification();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formMsg, setFormMsg] = useState("");

  useSEO({ titleKey: "seo.workshopsTitle", descKey: "seo.workshopsDesc", path: "/workshops" });
  useGsapPageEffects(rootRef);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/workshops", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { workshops: Workshop[] }) => { if (!ctrl.signal.aborted) setWorkshops(d.workshops || []); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  const handleRegister = async (workshopId: string) => {
    if (!formName.trim()) {
      setFormMsg(t("workshops.form.nameRequired"));
      return;
    }
    if (!formContact.trim()) {
      setFormMsg(t("workshops.form.contactRequired"));
      return;
    }
    setRegisteringId(workshopId);
    setFormMsg("");
    try {
      const r = await fetch(`/api/workshops/${workshopId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), contact: formContact.trim(), participants: 1 }),
      });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        setFormMsg(t("workshops.form.success"));
        setFormName("");
        setFormContact("");

        const workshop = workshops.find((w) => w.id === workshopId);
        await sendWorkshopRegistration(formContact.trim(), {
          registrationId: data.id,
          workshopTitle: workshop ? getTitle(workshop, i18n.language) : "Workshop",
          eventDate: workshop?.event_date,
          location: workshop?.location,
          name: formName.trim(),
        });

        setTimeout(() => { setFormOpen(null); setFormMsg(""); }, 2000);
      } else {
        const d = await r.json().catch(() => ({}));
        setFormMsg(d.error || t("workshops.form.error"));
      }
    } catch {
      setFormMsg(t("workshops.form.error"));
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">Workshops</p>
          <h1>{t("workshops.title")}</h1>
          <span>{t("workshops.intro")}</span>
        </div>
      </section>

      <section className="section-shell is-visible">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>{t("loading")}</div>
        ) : workshops.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p>{t("workshops.empty")}</p>
          </div>
        ) : (
          <div className="workshops-grid">
            {workshops.map((ws) => {
              const spotsLeft = (ws.max_participants || 0) - ws.current_participants;
              const isFull = spotsLeft <= 0;
              return (
                <div key={ws.id} className="workshop-card">
                  {ws.cover_image_url && (
                    <img src={ws.cover_image_url} alt={getTitle(ws, i18n.language)} className="workshop-cover" loading="lazy" />
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
                    {formOpen === ws.id ? (
                      <div className="workshop-register-form">
                        <label htmlFor={`workshop-name-${ws.id}`} className="sr-only">
                          {t("workshops.form.name")}
                        </label>
                        <input
                          id={`workshop-name-${ws.id}`}
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder={t("workshops.form.name")}
                          aria-label={t("workshops.form.name")}
                        />
                        <label htmlFor={`workshop-contact-${ws.id}`} className="sr-only">
                          {t("workshops.form.contact")}
                        </label>
                        <input
                          id={`workshop-contact-${ws.id}`}
                          value={formContact}
                          onChange={(e) => setFormContact(e.target.value)}
                          placeholder={t("workshops.form.contact")}
                          aria-label={t("workshops.form.contact")}
                        />
                        {formMsg && <p style={{ fontSize: 13, color: formMsg === t("workshops.form.success") ? "#22c55e" : "#ef4444", margin: "4px 0" }}>{formMsg}</p>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button type="primary" onClick={() => handleRegister(ws.id)} disabled={registeringId === ws.id}>
                            {registeringId === ws.id ? t("workshops.form.submitting") : t("workshops.form.submit")}
                          </Button>
                          <Button type="text" onClick={() => { setFormOpen(null); setFormMsg(""); }}>
                            {t("workshops.form.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="workshop-actions">
                        <Button
                          type="primary"
                          disabled={isFull}
                          onClick={() => { setFormOpen(ws.id); setFormMsg(""); }}
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
              );
            })}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
