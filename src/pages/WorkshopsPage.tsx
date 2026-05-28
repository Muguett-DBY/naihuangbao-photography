import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button, Input } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSiteContent } from "../hooks/useSiteContent";
import { PageTransition } from "../components/shared/PageTransition";
import type { Workshop } from "../types/content";

export function WorkshopsPage() {
  const { t } = useTranslation();
  const { siteConfig } = useSiteContent();
  const rootRef = useRef<HTMLDivElement>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formMsg, setFormMsg] = useState("");

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
    if (!formName.trim() || !formContact.trim()) {
      setFormMsg("请填写姓名和联系方式");
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
        setFormMsg("报名成功！我们会尽快联系你确认。");
        setFormName("");
        setFormContact("");
        setTimeout(() => { setFormOpen(null); setFormMsg(""); }, 2000);
      } else {
        const d = await r.json().catch(() => ({}));
        setFormMsg(d.error || "报名失败，请稍后重试");
      }
    } catch {
      setFormMsg("报名失败，请稍后重试");
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
            <p>{t("workshops.intro")}</p>
            <p style={{ opacity: 0.6, marginTop: 12 }}>近期暂无活动安排，请关注后续通知</p>
          </div>
        ) : (
          <div className="workshops-grid">
            {workshops.map((ws) => {
              const spotsLeft = (ws.max_participants || 0) - ws.current_participants;
              const isFull = spotsLeft <= 0;
              return (
                <div key={ws.id} className="workshop-card">
                  {ws.cover_image_url && (
                    <img src={ws.cover_image_url} alt={ws.title} className="workshop-cover" />
                  )}
                  <div className="workshop-info">
                    <h3>{ws.title}</h3>
                    <p>{ws.description}</p>
                    <div className="workshop-meta">
                      <span><Calendar size={14} /> {ws.event_date} {ws.event_time}</span>
                      {ws.location && <span><MapPin size={14} /> {ws.location}</span>}
                      <span><Users size={14} /> {isFull ? t("workshops.full") : `${t("workshops.spotsLeft")}: ${spotsLeft}`}</span>
                    </div>
                    <div className="workshop-actions">
                      {ws.price_display && <span className="workshop-price">{ws.price_display}</span>}
                      {formOpen === ws.id ? (
                        <div className="workshop-register-form" style={{ width: "100%", marginTop: 12 }}>
                          <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="你的名字" style={{ marginBottom: 8 }} />
                          <Input value={formContact} onChange={(e) => setFormContact(e.target.value)} placeholder="联系方式（微信/手机）" style={{ marginBottom: 8 }} />
                          {formMsg && <p style={{ fontSize: 13, color: formMsg.includes("成功") ? "#22c55e" : "#ef4444", margin: "4px 0" }}>{formMsg}</p>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <Button type="primary" onClick={() => handleRegister(ws.id)} disabled={registeringId === ws.id}>
                              {registeringId === ws.id ? "提交中..." : t("workshops.register")}
                            </Button>
                            <Button type="text" onClick={() => { setFormOpen(null); setFormMsg(""); }}>取消</Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="primary"
                          disabled={isFull}
                          onClick={() => { setFormOpen(ws.id); setFormMsg(""); }}
                        >
                          {t("workshops.register")}
                        </Button>
                      )}
                    </div>
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
