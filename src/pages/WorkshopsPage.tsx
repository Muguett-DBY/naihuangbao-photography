import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import type { Workshop } from "../types/content";

export function WorkshopsPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  useGsapPageEffects(rootRef);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/workshops", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: Workshop[]) => { if (!ctrl.signal.aborted) setWorkshops(d); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  const handleRegister = async (workshopId: string, name: string, contact: string) => {
    setRegisteringId(workshopId);
    try {
      await fetch(`/api/workshops/${workshopId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, participants: 1 }),
      });
    } catch {
      // ignore
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <PageTransition ref={rootRef}>
      <section className="section-shell hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading">
          <span className="section-eyebrow">Workshops</span>
          <h1>{t("workshops.title")}</h1>
          <p>{t("workshops.intro")}</p>
        </div>
      </section>

      <section className="section-shell">
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
                      <Button
                        type="primary"
                        disabled={isFull || registeringId === ws.id}
                        onClick={() => handleRegister(ws.id, "", "")}
                      >
                        {t("workshops.register")}
                      </Button>
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
