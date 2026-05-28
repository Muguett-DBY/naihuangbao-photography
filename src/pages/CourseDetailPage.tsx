import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, BarChart3, Lock, Unlock, Play, FileText, Images } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import type { Course, CourseModule } from "../types/content";

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeModule, setActiveModule] = useState<string | null>(null);

  useGsapPageEffects(rootRef);

  const lang = i18n.language.split("-")[0];

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    fetch(`/api/courses/${id}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { course: Course; modules: CourseModule[] }) => {
        if (!ctrl.signal.aborted) {
          setCourse(d.course || null);
          setModules(d.modules || []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id]);

  useEffect(() => {
    const stored = localStorage.getItem(`course-pw-${id}`);
    if (stored === "lwj5201314") setUnlocked(true);
  }, [id]);

  const handleUnlock = () => {
    if (passwordInput === "lwj5201314") {
      setUnlocked(true);
      localStorage.setItem(`course-pw-${id}`, "lwj5201314");
      setPasswordError("");
    } else {
      setPasswordError(t("courseDetail.wrongPassword"));
    }
  };

  const getTitle = (c: Course) => {
    if (lang === "en" && c.title_en) return c.title_en;
    if (lang === "ko" && c.title_ko) return c.title_ko;
    if (lang === "ja" && c.title_ja) return c.title_ja;
    return c.title;
  };

  const getDesc = (c: Course) => {
    if (lang === "en" && c.description_en) return c.description_en;
    if (lang === "ko" && c.description_ko) return c.description_ko;
    if (lang === "ja" && c.description_ja) return c.description_ja;
    return c.description;
  };

  const getModuleTitle = (m: CourseModule) => {
    if (lang === "en" && m.title_en) return m.title_en;
    if (lang === "ko" && m.title_ko) return m.title_ko;
    if (lang === "ja" && m.title_ja) return m.title_ja;
    return m.title;
  };

  const moduleIcon = (type: string) => {
    if (type === "video") return <Play size={16} />;
    if (type === "gallery") return <Images size={16} />;
    return <FileText size={16} />;
  };

  if (loading) {
    return (
      <PageTransition ref={rootRef}>
        <div style={{ textAlign: "center", padding: 120 }}>{t("loading")}</div>
      </PageTransition>
    );
  }

  if (!course) {
    return (
      <PageTransition ref={rootRef}>
        <div style={{ textAlign: "center", padding: 120 }}>
          <h2>{t("courseDetail.notFound")}</h2>
          <Link to="/courses" style={{ color: "var(--accent)" }}>{t("courseDetail.backToList")}</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <Link to="/courses" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent)", marginBottom: 16, fontSize: "0.9rem" }}>
            <ArrowLeft size={16} /> {t("courseDetail.backToList")}
          </Link>
          <p className="section-eyebrow">{t(`courses.categories.${course.category}` as any)}</p>
          <h1>{getTitle(course)}</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
            <span className="course-difficulty">{t(`courses.difficulty.${course.difficulty}` as any)}</span>
            {course.duration_minutes && (
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={14} /> {t("courses.duration", { minutes: course.duration_minutes })}
              </span>
            )}
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <BarChart3 size={14} /> {modules.length} {t("courseDetail.modules")}
            </span>
          </div>
        </div>
      </section>

      {course.cover_image_url && (
        <section className="section-shell is-visible" style={{ paddingTop: 0 }}>
          <img
            src={course.cover_image_url}
            alt={getTitle(course)}
            style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 16 }}
          />
        </section>
      )}

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("courseDetail.about")}</h2>
          <p style={{ lineHeight: 1.8, color: "var(--text-secondary)" }}>{getDesc(course)}</p>
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
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 16 }}>
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
                  <Unlock size={14} />
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
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{getModuleTitle(mod)}</span>
                    {moduleIcon(mod.type)}
                    {!unlocked && mod.type !== "text" && <Lock size={14} style={{ opacity: 0.5 }} />}
                  </button>
                  {activeModule === mod.id && mod.content && (
                    <div style={{
                      padding: "0 18px 18px",
                      fontSize: "0.9rem",
                      lineHeight: 1.7,
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                    }}>
                      {mod.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)" }}>{t("courseDetail.noModules")}</p>
          )}
        </div>
      </section>

      <section className="section-shell is-visible" style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: 16 }}>{t("courseDetail.ctaTitle")}</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>{t("courseDetail.ctaDesc")}</p>
        <Link
          to="/booking"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 32px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: 999,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {t("courseDetail.ctaBtn")}
        </Link>
      </section>
    </PageTransition>
  );
}
