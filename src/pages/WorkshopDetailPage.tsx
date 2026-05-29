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
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <DetailBackLink to="/workshops" label={t("workshopDetail.backToList")} />
          <h1>{getTitle(workshop, lang)}</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={14} /> {workshop.event_date} {workshop.event_time}
            </span>
            {workshop.location && (
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={14} /> {workshop.location}
              </span>
            )}
            <span style={{ fontSize: "0.85rem", color: isFull ? "#ef4444" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={14} /> {isFull ? t("workshops.full") : `${t("workshops.spotsLeft")}: ${spotsLeft}`}
            </span>
          </div>
        </div>
      </section>

      {workshop.cover_image_url && (
        <section className="section-shell is-visible" style={{ paddingTop: 0 }}>
          <img src={workshop.cover_image_url} alt={getTitle(workshop, lang)} style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 16 }} />
        </section>
      )}

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("workshopDetail.about")}</h2>
          <p style={{ lineHeight: 1.8, color: "var(--text-secondary)" }}>{getDesc(workshop, lang)}</p>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("workshopDetail.schedule")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
            <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: "var(--border-subtle)" }} />
            {[
              { time: "14:00", label: t("workshopDetail.step1") },
              { time: "14:15", label: t("workshopDetail.step2") },
              { time: "14:30", label: t("workshopDetail.step3") },
              { time: "16:00", label: t("workshopDetail.step4") },
              { time: "16:45", label: t("workshopDetail.step5") },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "12px 0", position: "relative" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, zIndex: 1 }}>{i + 1}</div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}><Clock size={12} style={{ verticalAlign: -1 }} /> {step.time}</span>
                  <p style={{ margin: "4px 0 0", fontSize: "0.95rem" }}>{step.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("workshopDetail.guide")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { title: t("workshopDetail.gearTitle"), items: ["相机+镜头", "备用电池", "存储卡", "三脚架（可选）"] },
              { title: t("workshopDetail.clothingTitle"), items: ["舒适运动鞋", "防晒帽", "深色衣物为佳", "备一件外套"] },
              { title: t("workshopDetail.tipsTitle"), items: ["提前到场", "手机充电", "保持开放心态", "享受拍摄过程"] },
            ].map((section, i) => (
              <div key={i} style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 16 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>{section.title}</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {section.items.map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <CheckCircle size={14} style={{ color: "var(--accent)", flexShrink: 0 }} /> {item}
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
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ marginBottom: 16 }}>{t("workshopDetail.location")}</h2>
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <MapPin size={20} style={{ color: "var(--accent)" }} />
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>{workshop.location}</p>
                <a href={`https://uri.amap.com/marker?position=&name=${encodeURIComponent(workshop.location)}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.85rem", color: "var(--accent)" }}>{t("workshopDetail.openInMap")}</a>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("workshopDetail.register")}</h2>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            {workshop.price_display && <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 16 }}>{workshop.price_display}</div>}
            {isFull ? (
              <p style={{ color: "#ef4444" }}>{t("workshopDetail.fullMessage")}</p>
            ) : (
              <>
                <input
                  value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("workshops.form.name")}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: "0.9rem", marginBottom: 8, boxSizing: "border-box" }}
                />
                <input
                  value={formContact} onChange={(e) => setFormContact(e.target.value)}
                  placeholder={t("workshops.form.contact")}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: "0.9rem", marginBottom: 12, boxSizing: "border-box" }}
                />
                {formMsg && <p style={{ fontSize: 13, color: formMsg === t("workshops.form.success") ? "#22c55e" : "#ef4444", margin: "0 0 12px" }}>{formMsg}</p>}
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
