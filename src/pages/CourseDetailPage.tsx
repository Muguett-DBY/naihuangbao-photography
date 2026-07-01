import "../styles/pages.css";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, BarChart3, Lock, Play, FileText, Images, LogIn, ShoppingCart, CheckCircle } from "lucide-react";
import { Button } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useNotification } from "../hooks/useNotification";
import { useSEO } from "../hooks/useSEO";
import { useJsonLd } from "../hooks/useJsonLd";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { getTitle, getDesc, getLocalizedField } from "../lib/i18n-helpers";
import { tCourseCategory, tCourseDifficulty } from "../lib/i18n-typed";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import { VideoPlayer } from "../components/VideoPlayer";
import { PaymentForm } from "../components/PaymentForm";
import { siteOrigin } from "../lib/site-origin";
import { publicMutationHeaders } from "../lib/admin-helpers";
import { logAndIgnore } from "../lib/errors";
import type { Course, CourseModule } from "../types/content";

const fetchWithCredentials: RequestInit = { credentials: "include" };

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { sendPaymentReceipt } = useNotification();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<"pending" | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(() => {
    if (!id) return new Set();
    try {
      const saved = localStorage.getItem(`course-progress-${id}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch (error) {
      logAndIgnore("Course progress restore failed", error);
    }
    return new Set();
  });
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const lang = i18n.language;

  const { data, loading, error } = useFetch<{ course: Course; modules: CourseModule[] }>(
    id ? `/api/courses/${id}` : null,
    fetchWithCredentials,
  );

  const { data: accessData } = useFetch<{ hasAccess: boolean }>(
    user && id ? `/api/courses/${id}/access` : null,
    fetchWithCredentials,
  );

  const { data: progressData } = useFetch<{ completedModules: string[] }>(
    user && id ? `/api/courses/${id}/progress` : null,
    fetchWithCredentials,
  );

  const unlocked = accessData?.hasAccess ?? false;
  const modules = data?.modules ?? [];
  const totalModules = modules.length;
  const completedCount = completedModules.size;
  const progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  // Sync progress from server when available
  useEffect(() => {
    if (progressData?.completedModules && id) {
      const serverModules = new Set(progressData.completedModules);
      const localModules = new Set(completedModules);
      const merged = new Set([...serverModules, ...localModules]);
      if (merged.size > completedModules.size) {
        setCompletedModules(merged);
      }
    }
  }, [progressData, id]);

  // Persist completed modules to localStorage
  useEffect(() => {
    if (id) {
      try {
        localStorage.setItem(`course-progress-${id}`, JSON.stringify(Array.from(completedModules)));
      } catch (error) {
        logAndIgnore("Course progress save failed", error);
      }
    }
  }, [id, completedModules]);

  // Save progress to server
  const saveProgressToServer = useCallback(async (modules: Set<string>) => {
    if (!user || !id) return;
    setSyncing(true);
    try {
      await fetch(`/api/courses/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        body: JSON.stringify({ completedModules: Array.from(modules) }),
      });
    } catch (err) {
      console.error("[CourseProgress]", err);
    } finally {
      setSyncing(false);
    }
  }, [user, id]);

  const toggleModuleCompletion = (moduleId: string) => {
    setCompletedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      // Save to server in background
      saveProgressToServer(next);
      return next;
    });
  };

  const courseTitle = data?.course ? getTitle(data.course, lang) : "";
  useSEO({
    title: courseTitle,
    descKey: "seo.courseDetailDesc",
    path: id ? `/courses/${id}` : undefined,
  });

  const courseJsonLd = useMemo(() => {
    if (!data?.course) return null;
    const c = data.course;
    return {
      "@context": "https://schema.org",
      "@type": "Course",
      "@id": `${siteOrigin}/courses/${c.id}#course`,
      name: courseTitle,
      description: getDesc(c, lang) || courseTitle,
      url: `${siteOrigin}/courses/${c.id}`,
      provider: {
        "@type": "Organization",
        name: "Naihuangbao Photography",
        sameAs: siteOrigin,
      },
      educationalLevel: tCourseDifficulty(t, c.difficulty),
      inLanguage: lang,
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: c.category === "online" ? "online" : "onsite",
        courseWorkload: c.duration_minutes ? `PT${c.duration_minutes}M` : undefined,
        instructor: {
          "@type": "Person",
          name: "Naihuangbao Photography",
        },
      },
      offers: c.price_cents
        ? {
            "@type": "Offer",
            category: "Paid",
            price: (c.price_cents / 100).toFixed(2),
            priceCurrency: c.currency || "CNY",
            availability: "https://schema.org/InStock",
            url: `${siteOrigin}/courses/${c.id}`,
          }
        : { "@type": "Offer", category: "Free", price: "0", priceCurrency: "CNY" },
    };
  }, [data, courseTitle, lang, t]);

  useJsonLd({
    id: data?.course ? `course-${data.course.id}` : "course-empty",
    data: courseJsonLd ?? {},
  });

  const breadcrumb = useMemo(() => {
    if (!data?.course) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteOrigin}/` },
        { "@type": "ListItem", position: 2, name: "Courses", item: `${siteOrigin}/courses` },
        { "@type": "ListItem", position: 3, name: courseTitle, item: `${siteOrigin}/courses/${data.course.id}` },
      ],
    };
  }, [data, courseTitle]);

  useJsonLd({
    id: data?.course ? `course-breadcrumb-${data.course.id}` : "course-breadcrumb-empty",
    data: breadcrumb ?? {},
  });

  useGsapPageEffects(rootRef);

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !data?.course) return <DetailNotFound message={t("courseDetail.notFound")} backTo="/courses" backLabel={t("courseDetail.backToList")} />;

  const course = data.course;

  const getModuleTitle = (m: CourseModule) => getLocalizedField(m, lang, "title");

  const moduleIcon = (type: string) => {
    if (type === "video") return <Play size={16} />;
    if (type === "gallery") return <Images size={16} />;
    return <FileText size={16} />;
  };

  const isPaidCourse = !!course.price_cents && course.price_cents > 0;

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <DetailBackLink to="/courses" label={t("courseDetail.backToList")} />
          <p className="section-eyebrow">{tCourseCategory(t, course.category)}</p>
          <h1>{getTitle(course, lang)}</h1>
          <div className="course-detail-meta">
            <span className="course-difficulty">{tCourseDifficulty(t, course.difficulty)}</span>
            {course.duration_minutes && (
              <span><Clock size={14} /> {t("courses.duration", { minutes: course.duration_minutes })}</span>
            )}
            <span><BarChart3 size={14} /> {modules.length} {t("courseDetail.modules")}</span>
          </div>
        </div>
      </section>

      <ErrorBoundary>
      {course.cover_image_url && (
        <section className="section-shell is-visible" style={{ paddingTop: 0 }}>
          <img
            src={course.cover_image_url}
            alt={getTitle(course, lang)}
            className="course-detail-cover"
            width={800}
            height={400}
            loading="lazy"
          />
        </section>
      )}

      <section className="section-shell is-visible">
        <div className="course-detail-content">
          <h2>{t("courseDetail.about")}</h2>
          <p>{getDesc(course, lang)}</p>
        </div>
      </section>

      {course.video_url && (
        <section className="section-shell is-visible">
          <div className="course-detail-content">
            <h2>{t("courseDetail.preview")}</h2>
            <VideoPlayer src={course.video_url} title={getTitle(course, lang)} />
          </div>
        </section>
      )}

      <section className="section-shell is-visible">
        <div className="course-detail-content">
          <h2>{t("courseDetail.syllabus")}</h2>

          {/* Progress Bar */}
          {user && unlocked && totalModules > 0 && (
            <div className="course-detail-progress">
              <div className="course-detail-progress-header">
                <span className="course-detail-progress-label">
                  {t("courseDetail.progress", "Progress")}: {completedCount}/{totalModules}
                  {syncing && <span className="course-detail-syncing"> ({t("courseDetail.syncing", "syncing...")})</span>}
                </span>
                <span className="course-detail-progress-pct">
                  {progressPercent === 100 ? (
                    <CheckCircle size={14} className="course-detail-complete-icon" />
                  ) : null}
                  {progressPercent}%
                </span>
              </div>
              <div className="course-detail-progress-bar">
                <div className="course-detail-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          {!user && (
            <div className="course-detail-lock-gate">
              <Lock size={32} />
              <h3>{t("courseDetail.loginRequired", "登录以访问课程内容")}</h3>
              <p>{t("courseDetail.loginRequiredDesc", "请登录您的账户以查看完整课程内容")}</p>
              <Link to="/login" className="course-detail-login-btn">
                <LogIn size={14} />
                {t("auth.login", "登录")}
              </Link>
            </div>
          )}

          {user && !unlocked && (
            <div className="course-detail-lock-gate">
              <Lock size={32} />
              <h3>{t("courseDetail.purchaseRequired", "购买课程以解锁全部内容")}</h3>
              <p>{t("courseDetail.purchaseRequiredDesc", "购买此课程后即可查看所有模块内容")}</p>
              {isPaidCourse && (
                <Button type="primary" onClick={() => setShowPayment(true)}>
                  <ShoppingCart size={14} />
                  {t("courseDetail.buyNow", "Buy Course")}
                </Button>
              )}
            </div>
          )}

          {modules.length > 0 ? (
            <div className="course-detail-modules">
              {modules.map((mod, i) => (
                <div
                  key={mod.id}
                  className={`course-detail-module ${activeModule === mod.id ? "is-active" : ""} ${!unlocked && mod.type !== "text" ? "is-locked" : ""}`}
                >
                  <button
                    onClick={() => {
                      if (unlocked || mod.type === "text") {
                        setActiveModule(activeModule === mod.id ? null : mod.id);
                      }
                    }}
                    className="course-detail-module-btn"
                    style={{ cursor: unlocked || mod.type === "text" ? "pointer" : "default" }}
                  >
                    <span className="course-detail-module-num">{i + 1}</span>
                    <span className="course-detail-module-title">{getModuleTitle(mod)}</span>
                    {moduleIcon(mod.type)}
                    {!unlocked && mod.type !== "text" && <Lock size={14} style={{ opacity: 0.5 }} />}
                  </button>
                  {activeModule === mod.id && mod.content && (
                    <div className="course-detail-module-content">
                      {mod.content}
                    </div>
                  )}
                  {unlocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModuleCompletion(mod.id);
                      }}
                      className={`course-detail-module-check ${completedModules.has(mod.id) ? "is-completed" : ""}`}
                      title={completedModules.has(mod.id)
                        ? t("courseDetail.markIncomplete", "Mark as incomplete")
                        : t("courseDetail.markComplete", "Mark as complete")}
                    >
                      {completedModules.has(mod.id) ? "✓" : "○"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--caramel-muted)" }}>{t("courseDetail.noModules")}</p>
          )}
        </div>
      </section>

      {isPaidCourse && !unlocked && (
        <section className="section-shell is-visible">
          <div className="course-detail-content">
            <h2>{t("courseDetail.purchase", "Purchase Course")}</h2>
            {showPayment ? (
              <PaymentForm
                purpose="course_purchase"
                amountCents={course.price_cents!}
                currency={course.currency || "usd"}
                referenceId={course.id}
                metadata={{ title: getTitle(course, lang) }}
                onSuccess={async (paymentIntentId) => {
                  setShowPayment(false);
                  setPurchaseNotice(null);

                  if (user?.email) {
                    await sendPaymentReceipt(user.email, {
                      paymentIntentId,
                      purpose: "Course Purchase",
                      amountCents: course.price_cents!,
                      currency: course.currency || "usd",
                      name: user.displayName || user.email,
                    });
                  }
                }}
                onPending={() => {
                  setShowPayment(false);
                  setPurchaseNotice("pending");
                }}
                onError={() => {}}
                onCancel={() => setShowPayment(false)}
              />
            ) : (
              <div className="course-detail-purchase-box">
                {course.price_display && (
                  <div className="course-detail-price">{course.price_display}</div>
                )}
                <p className="course-detail-purchase-desc">
                  {t("courseDetail.purchaseDesc", "Get full access to all course modules and materials.")}
                </p>
                {purchaseNotice === "pending" && (
                  <div className="course-payment-status-note" role="status">
                    <strong>{t("courseDetail.paymentPendingTitle", "Payment pending")}</strong>
                    <span>{t("courseDetail.paymentPendingDesc", "No charge was made. We will follow up before granting paid course access.")}</span>
                  </div>
                )}
                <Button type="primary" onClick={() => { setPurchaseNotice(null); setShowPayment(true); }}>
                  <ShoppingCart size={14} />
                  {t("courseDetail.buyNow", "Buy Course")}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section-shell is-visible course-detail-cta">
        <div className="course-detail-content">
          <h2>{t("courseDetail.ctaTitle")}</h2>
          <p>{t("courseDetail.ctaDesc")}</p>
          <Link to="/booking" className="course-detail-cta-link">
            {t("courseDetail.ctaBtn")}
          </Link>
        </div>
      </section>
      </ErrorBoundary>
    </PageTransition>
  );
}
