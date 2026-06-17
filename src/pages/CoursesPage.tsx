import { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Clock } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { DataState } from "../components/shared/DataState";
import { getTitle, getDesc } from "../lib/i18n-helpers";
import { tCourseCategory, tCourseDifficulty } from "../lib/i18n-typed";
import type { Course } from "../types/content";

type CategoryFilter = string | "all";

export function CoursesPage() {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items: courses, loading, error, retry, empty } = useApiList<Course>("/api/courses", "courses");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  useSEO({ titleKey: "seo.coursesTitle", descKey: "seo.coursesDesc", path: "/courses" });
  useGsapPageEffects(rootRef);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach((c) => cats.add(c.category));
    return Array.from(cats);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (filter === "all") return courses;
    return courses.filter((c) => c.category === filter);
  }, [courses, filter]);

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
          {categories.length > 1 && (
            <div className="filter-row" role="group" aria-label={t("courses.title")}>
              <button
                type="button"
                aria-pressed={filter === "all"}
                className={filter === "all" ? "is-active" : ""}
                onClick={() => setFilter("all")}
              >
                {t("gallery.filters.all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={filter === cat}
                  className={filter === cat ? "is-active" : ""}
                  onClick={() => setFilter(cat)}
                >
                  {tCourseCategory(t, cat)}
                </button>
              ))}
            </div>
          )}

          <div className="courses-grid">
            {filteredCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="course-card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                {course.cover_image_url ? (
                  <div className="course-cover-wrap">
                    <img src={course.cover_image_url} alt={getTitle(course, i18n.language)} className="course-cover" loading="lazy" />
                    <span className="course-cover-badge">{tCourseDifficulty(t, course.difficulty)}</span>
                  </div>
                ) : (
                  <div className="course-cover-placeholder">
                    <BookOpen size={32} />
                  </div>
                )}
                <div className="course-info">
                  <span className="course-category">{tCourseCategory(t, course.category)}</span>
                  <h3>{getTitle(course, i18n.language)}</h3>
                  <p>{getDesc(course, i18n.language)}</p>
                  {course.duration_minutes && (
                    <div className="course-meta-row">
                      <span className="course-meta-item">
                        <Clock size={13} />
                        {t("courses.duration", { minutes: course.duration_minutes })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </DataState>
      </section>
    </PageTransition>
  );
}
