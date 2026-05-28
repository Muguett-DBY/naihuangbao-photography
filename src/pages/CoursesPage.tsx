import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import type { Course } from "../types/content";

export function CoursesPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useGsapPageEffects(rootRef);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/courses", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { courses: Course[] }) => { if (!ctrl.signal.aborted) setCourses(d.courses || []); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <span className="section-eyebrow">Courses</span>
          <h1>{t("courses.title")}</h1>
          <p>{t("courses.intro")}</p>
        </div>
      </section>

      <section className="section-shell is-visible">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>{t("loading")}</div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p>{t("courses.intro")}</p>
            <p style={{ opacity: 0.6, marginTop: 12 }}>课程内容即将上线，敬请期待</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card">
                {course.cover_image_url && (
                  <img src={course.cover_image_url} alt={course.title} className="course-cover" />
                )}
                <div className="course-info">
                  <span className="course-category">{t(`courses.categories.${course.category}` as any)}</span>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <span className="course-difficulty">{course.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
