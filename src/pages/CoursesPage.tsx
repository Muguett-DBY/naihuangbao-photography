import { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { DataState } from "../components/shared/DataState";
import { getTitle, getDesc } from "../lib/i18n-helpers";
import { tCourseCategory, tCourseDifficulty } from "../lib/i18n-typed";
import type { Course } from "../types/content";

export function CoursesPage() {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items: courses, loading, error, retry, empty } = useApiList<Course>("/api/courses", "courses");

  useSEO({ titleKey: "seo.coursesTitle", descKey: "seo.coursesDesc", path: "/courses" });
  useGsapPageEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <PageHero
        eyebrow="Courses"
        title={t("courses.title")}
        subtitle={t("courses.intro")}
      />

      <section className="section-shell is-visible">
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<BookOpen size={40} strokeWidth={1.2} />}
          emptyText={t("courses.empty")}
        >
          <div className="courses-grid">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="course-card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                {course.cover_image_url && (
                  <img src={course.cover_image_url} alt={getTitle(course, i18n.language)} className="course-cover" loading="lazy" />
                )}
                <div className="course-info">
                  <span className="course-category">{tCourseCategory(t, course.category)}</span>
                  <h3>{getTitle(course, i18n.language)}</h3>
                  <p>{getDesc(course, i18n.language)}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="course-difficulty">{tCourseDifficulty(t, course.difficulty)}</span>
                    {course.duration_minutes && (
                      <span style={{ fontSize: "0.8rem", color: "var(--caramel-muted)" }}>
                        {t("courses.duration", { minutes: course.duration_minutes })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </DataState>
      </section>
    </PageTransition>
  );
}
