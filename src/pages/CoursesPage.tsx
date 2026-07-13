import "../styles/pages.css";
import { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, BookOpen, Clock } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { ErrorBoundary } from "../components/ErrorBoundary";
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
    const cats = new Map<string, number>();
    courses.forEach((c) => cats.set(c.category, (cats.get(c.category) || 0) + 1));
    return Array.from(cats.entries());
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (filter === "all") return courses;
    return courses.filter((c) => c.category === filter);
  }, [courses, filter]);

  return (
    <PageTransition ref={rootRef} className="catalogue-page catalogue-page--courses">
      <PageHero
        eyebrow="Courses"
        title={t("courses.title")}
        subtitle={t("courses.intro")}
        image="/images/gallery/gallery-garden-01.webp"
        imageAlt={t("courses.title")}
        issue="ISSUE 03"
      />

      <section className="section-shell catalogue-section is-visible">
        <ErrorBoundary>
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<BookOpen size={40} strokeWidth={1.2} />}
          emptyText={t("courses.empty")}
        >
          <header className="catalogue-section-heading">
            <span>COURSE ARCHIVE / {String(filteredCourses.length).padStart(2, "0")}</span>
            <p>{t("courses.intro")}</p>
          </header>
          {categories.length > 1 && (
            <div className="filter-row catalogue-toolbar" role="group" aria-label={t("courses.title")}>
              <button
                type="button"
                aria-pressed={filter === "all"}
                className={filter === "all" ? "is-active" : ""}
                onClick={() => setFilter("all")}
              >
                {t("gallery.filters.all")}
                <span className="filter-count">{courses.length}</span>
              </button>
              {categories.map(([cat, count]) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={filter === cat}
                  className={filter === cat ? "is-active" : ""}
                  onClick={() => setFilter(cat)}
                >
                  {tCourseCategory(t, cat)}
                  <span className="filter-count">{count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="courses-grid">
            {filteredCourses.map((course, index) => (
              <article key={course.id} className="course-card catalogue-card">
                <Link to={`/courses/${course.id}`} className="catalogue-card-link">
                  <span className="catalogue-card-index">{String(index + 1).padStart(2, "0")}</span>
                  {course.cover_image_url ? (
                    <div className="course-cover-wrap catalogue-card-media">
                      <img src={course.cover_image_url} alt={getTitle(course, i18n.language)} className="course-cover" loading="lazy" />
                      <span className="course-cover-badge">{tCourseDifficulty(t, course.difficulty)}</span>
                    </div>
                  ) : (
                    <div className="course-cover-placeholder catalogue-card-media">
                      <BookOpen size={32} aria-hidden="true" />
                    </div>
                  )}
                  <div className="course-info catalogue-card-copy">
                    <span className="course-category">{tCourseCategory(t, course.category)}</span>
                    <h3>{getTitle(course, i18n.language)}</h3>
                    <p>{getDesc(course, i18n.language)}</p>
                    <div className="catalogue-card-footer">
                      {course.duration_minutes ? (
                        <span className="course-meta-item">
                          <Clock size={14} aria-hidden="true" />
                          {t("courses.duration", { minutes: course.duration_minutes })}
                        </span>
                      ) : <span />}
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </DataState>
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
