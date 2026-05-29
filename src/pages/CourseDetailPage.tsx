import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, BarChart3, Lock, Unlock, Play, FileText, Images } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { getTitle, getDesc, getLocalizedField } from "../lib/i18n-helpers";
import { useFetch } from "../hooks/useFetch";
import type { Course, CourseModule } from "../types/content";

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { data, loading, error } = useFetch<{ course: Course; modules: CourseModule[] }>(
    id ? `/api/courses/${id}` : null,
  );

  useGsapPageEffects(rootRef);

  useEffect(() => {
    const stored = localStorage.getItem(`course-unlocked-${id}`);
    if (stored === "1") setUnlocked(true);
  }, [id]);

  const handleUnlock = async () => {
    if (!passwordInput.trim()) { setPasswordError(t("courseDetail.wrongPassword")); return; }
    setVerifying(true);
    setPasswordError("");
    try {
      const r = await fetch(`/api/courses/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const d = await r.json();
      if (d.verified) {
        setUnlocked(true);
        localStorage.setItem(`course-unlocked-${id}`, "1");
      } else {
        setPasswordError(t("courseDetail.wrongPassword"));
      }
    } catch {
      setPasswordError(t("courseDetail.wrongPassword"));
    } finally {
      setVerifying(false);
    }
  };

  const lang = i18n.language;

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !data?.course) return <DetailNotFound message={t("courseDetail.notFound")} backTo="/courses" backLabel={t("courseDetail.backToList")} />;

  const course = data.course;
  const modules = data.modules || [];

  const getModuleTitle = (m: CourseModule) => getLocalizedField(m, lang, "title");

  const moduleIcon = (type: string) => {
    if (type === "video") return <Play size={16} />;
    if (type === "gallery") return <Images size={16} />;
    return <FileText size={16} />;
  };

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <DetailBackLink to="/courses" label={t("courseDetail.backToList")} />
          <p className="section-eyebrow">{t(`courses.categories.${course.category}` as any)}</p>
          <h1>{getTitle(course, lang)}</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
            <span className="course-difficulty">{t(`courses.difficulty.${course.difficulty}` as any)}</span>
            {course.duration_minutes && (
              <span style={{ fontSize: "0.85rem", color: "var(--caramel-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={14} /> {t("courses.duration", { minutes: course.duration_minutes })}
              </span>
            )}
            <span style={{ fontSize: "0.85rem", color: "var(--caramel-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <BarChart3 size={14} /> {modules.length} {t("courseDetail.modules")}
            </span>
          </div>
        </div>
      </section>

      {course.cover_image_url && (
        <section className="section-shell is-visible" style={{ paddingTop: 0 }}>
          <img
            src={course.cover_image_url}
            alt={getTitle(course, lang)}
            width={800}
            height={400}
            loading="lazy"
            style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 16 }}
          />
        </section>
      )}

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("courseDetail.about")}</h2>
          <p style={{ lineHeight: 1.8, color: "var(--caramel-muted)" }}>{getDesc(course, lang)}</p>
        </div>
      </section>

      {course.video_url && (
        <section className="section-shell is-visible">
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ marginBottom: 16 }}>{t("courseDetail.preview")}</h2>
            <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: 16, overflow: "hidden" }}>
              <iframe
                src={course.video_url}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("courseDetail.syllabus")}</h2>

          {!unlocked && (
            <div style={{
              background: "var(--card-bg, rgba(255,255,255,0.7))",
              border: "1px solid var(--border-subtle)",
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              textAlign: "center",
            }}>
              <Lock size={32} style={{ color: "var(--accent)", marginBottom: 12 }} />
              <h3 style={{ marginBottom: 8 }}>{t("courseDetail.lockedTitle")}</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--caramel-muted)", marginBottom: 16 }}>
                {t("courseDetail.lockedDesc")}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 320, margin: "0 auto" }}>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  placeholder={t("courseDetail.passwordPlaceholder")}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    fontSize: "0.9rem",
                  }}
                />
                <button
                  onClick={handleUnlock}
                  disabled={verifying}
                  style={{
                    padding: "10px 20px",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {verifying ? "..." : <Unlock size={14} />}
                </button>
              </div>
              {passwordError && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 8 }}>{passwordError}</p>}
            </div>
          )}

          {modules.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {modules.map((mod, i) => (
                <div
                  key={mod.id}
                  style={{
                    background: activeModule === mod.id ? "var(--card-bg)" : "transparent",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    overflow: "hidden",
                    opacity: unlocked || mod.type === "text" ? 1 : 0.5,
                  }}
                >
                  <button
                    onClick={() => {
                      if (unlocked || mod.type === "text") {
                        setActiveModule(activeModule === mod.id ? null : mod.id);
                      }
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      background: "none",
                      border: "none",
                      cursor: unlocked || mod.type === "text" ? "pointer" : "default",
                      textAlign: "left",
                      fontSize: "0.95rem",
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%", background: "var(--accent)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.8rem", fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{getModuleTitle(mod)}</span>
                    {moduleIcon(mod.type)}
                    {!unlocked && mod.type !== "text" && <Lock size={14} style={{ opacity: 0.5 }} />}
                  </button>
                  {activeModule === mod.id && mod.content && (
                    <div style={{
                      padding: "0 18px 18px", fontSize: "0.9rem", lineHeight: 1.7,
                      color: "var(--caramel-muted)", whiteSpace: "pre-wrap",
                    }}>
                      {mod.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--caramel-muted)" }}>{t("courseDetail.noModules")}</p>
          )}
        </div>
      </section>

      <section className="section-shell is-visible" style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: 16 }}>{t("courseDetail.ctaTitle")}</h2>
        <p style={{ color: "var(--caramel-muted)", marginBottom: 24 }}>{t("courseDetail.ctaDesc")}</p>
        <Link
          to="/booking"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 32px",
            background: "var(--accent)", color: "#fff", borderRadius: 999,
            textDecoration: "none", fontWeight: 600,
          }}
        >
          {t("courseDetail.ctaBtn")}
        </Link>
      </section>
    </PageTransition>
  );
}
