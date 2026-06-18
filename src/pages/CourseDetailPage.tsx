import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, BarChart3, Lock, Play, FileText, Images, LogIn, ShoppingCart } from "lucide-react";
import { Button } from "animal-island-ui";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useNotification } from "../hooks/useNotification";
import { useSEO } from "../hooks/useSEO";
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
import type { Course, CourseModule } from "../types/content";

const fetchWithCredentials: RequestInit = { credentials: "include" };

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { sendPaymentReceipt } = useNotification();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
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

  const unlocked = accessData?.hasAccess ?? false;

  const courseTitle = data?.course ? getTitle(data.course, lang) : "";
  useSEO({
    title: courseTitle,
    descKey: "seo.courseDetailDesc",
    path: id ? `/courses/${id}` : undefined,
  });

  useGsapPageEffects(rootRef);

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
                <Button type="primary" onClick={() => setShowPayment(true)}>
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
