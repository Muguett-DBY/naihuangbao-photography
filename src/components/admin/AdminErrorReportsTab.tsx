import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bug } from "lucide-react";
import { Loading } from "animal-island-ui";
import { useTranslation } from "react-i18next";
import { isAbortError } from "../../lib/admin-helpers";

type ErrorReport = {
  id: string;
  message: string;
  category: string;
  source: string | null;
  url: string | null;
  userAgent: string | null;
  stack: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

type ErrorReportResponse = {
  reports: ErrorReport[];
  total: number;
  days: number;
};

const RANGES = [7, 30] as const;

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function pageFromUrl(value: string | null) {
  if (!value) return "-";
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value;
  }
}

export function AdminErrorReportsTab() {
  const { t } = useTranslation();
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const [data, setData] = useState<ErrorReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/admin/errors?days=${days}`, { credentials: "include", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load error reports");
        return response.json() as Promise<ErrorReportResponse>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setData(payload);
      })
      .catch((err) => {
        if (!isAbortError(err) && !controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const report of data?.reports ?? []) {
      counts.set(report.category, (counts.get(report.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="adm-content-panel" style={{ position: "relative", minHeight: 250 }}>
        <Loading active />
      </div>
    );
  }

  return (
    <div className="adm-content-panel">
      <header className="adm-errors-header">
        <div>
          <h2><Bug size={18} /> {t("admin.errors.title", "Error reports")}</h2>
          <p>{t("admin.errors.description", "Recent frontend errors captured from visitor browsers.")}</p>
        </div>
        <div className="adm-vitals-range" aria-label={t("admin.errors.rangeLabel", "Error report date range")}>
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              className={`adm-vitals-range-btn${days === range ? " is-active" : ""}`}
              onClick={() => setDays(range)}
            >
              {t("admin.errors.days", "{{count}}d", { count: range })}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="adm-errors-empty" role="alert">
          <AlertTriangle size={28} />
          <p>{t("admin.errors.loadFailed", "Unable to load error reports.")}</p>
        </div>
      ) : data && data.total > 0 ? (
        <>
          <div className="adm-errors-summary" aria-label={t("admin.errors.summary", "Error report summary")}>
            <strong>{data.total}</strong>
            <span>{t("admin.errors.total", "reports in this range")}</span>
            {categoryCounts.map(([category, count]) => (
              <span key={category} className="adm-errors-chip">{category}: {count}</span>
            ))}
          </div>
          <table className="adm-errors-table">
            <thead>
              <tr>
                <th scope="col">{t("admin.errors.colTime", "Time")}</th>
                <th scope="col">{t("admin.errors.colCategory", "Category")}</th>
                <th scope="col">{t("admin.errors.colMessage", "Message")}</th>
                <th scope="col">{t("admin.errors.colPage", "Page")}</th>
                <th scope="col">{t("admin.errors.colSource", "Source")}</th>
              </tr>
            </thead>
            <tbody>
              {data.reports.map((report) => (
                <tr key={report.id}>
                  <td>{formatTime(report.occurredAt)}</td>
                  <td><span className={`adm-errors-category adm-errors-category--${report.category}`}>{report.category}</span></td>
                  <td className="adm-errors-message">{report.message}</td>
                  <td>{pageFromUrl(report.url)}</td>
                  <td>{report.source || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="adm-errors-empty">
          <Bug size={32} />
          <p>{t("admin.errors.empty", "No frontend errors have been reported in this range.")}</p>
        </div>
      )}
    </div>
  );
}
