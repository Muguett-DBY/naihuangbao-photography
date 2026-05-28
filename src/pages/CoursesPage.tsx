import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
          <p className="section-eyebrow">Courses</p>
          <h1>{t("courses.title")}</h1>
          <span>{t("courses.intro")}</span>
        </div>
      </section>

      <section className="section-shell is-visible">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>{t("loading")}</div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p>{t("courses.empty")}</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="course-card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                {course.cover_image_url && (
                  <img src={course.cover_image_url} alt={course.title} className="course-cover" loading="lazy" />
                )}
                <div className="course-info">
                  <span className="course-category">{t(`courses.categories.${course.category}` as any)}</span>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="course-difficulty">{t(`courses.difficulty.${course.difficulty}` as any)}</span>
                    {course.duration_minutes && (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #666)" }}>
                        {t("courses.duration", { minutes: course.duration_minutes })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
