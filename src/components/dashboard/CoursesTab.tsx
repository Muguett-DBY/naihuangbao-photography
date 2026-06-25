import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { DashboardTabWrapper } from "./DashboardTabWrapper";
import { tCourseDifficulty } from "../../lib/i18n-typed";
import type { Course } from "../../types/dashboard";

export function CoursesTab() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useFetch<{ courses: Course[] }>("/api/user/courses");

  const courses = data?.courses ?? [];

  return (
    <DashboardTabWrapper
      loading={loading}
      error={error}
      empty={courses.length === 0}
      emptyIcon={<BookOpen size={40} strokeWidth={1.2} />}
      emptyTitle={t("dashboard.emptyStates.courses.title")}
      emptyText={t("dashboard.emptyStates.courses.description")}
      emptyAction={{ href: "/courses", label: t("dashboard.emptyStates.courses.action") }}
      retry={retry}
    >
      <div className="dashboard-list">
        {courses.map((c) => (
          <div key={c.id} className="dashboard-card">
            <div className="dashboard-card-header">
              <h4>{c.title}</h4>
              <span className="dashboard-card-type">{tCourseDifficulty(t, c.difficulty)}</span>
            </div>
            <div className="dashboard-progress">
              <div className="dashboard-progress-bar">
                <div className="dashboard-progress-fill" style={{ width: `${c.progress ?? 0}%` }} />
              </div>
              <span className="dashboard-progress-text">{c.progress ?? 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardTabWrapper>
  );
}
