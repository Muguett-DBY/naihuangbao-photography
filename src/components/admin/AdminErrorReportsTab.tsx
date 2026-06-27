import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bug, CheckCircle2, EyeOff, LoaderCircle, RotateCcw } from "lucide-react";
import { Loading } from "animal-island-ui";
import { useTranslation } from "react-i18next";
import { adminMutationHeaders, isAbortError } from "../../lib/admin-helpers";

type ErrorStatus = "open" | "resolved" | "ignored";
type StatusFilter = "all" | ErrorStatus;

type ErrorReport = {
  id: string;
  message: string;
  category: string;
  source: string | null;
  url: string | null;
  userAgent: string | null;
  stack: string | null;
  metadata: Record<string, unknown>;
  status: ErrorStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  occurredAt: string;
};

type ErrorReportResponse = {
  reports: ErrorReport[];
  total: number;
  days: number;
};

const RANGES = [7, 30] as const;
const STATUS_FILTERS: StatusFilter[] = ["all", "open", "resolved", "ignored"];

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [data, setData] = useState<ErrorReportResponse | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/admin/errors?days=${days}&status=${statusFilter}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load error reports");
        return response.json() as Promise<ErrorReportResponse>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) {
          setData(payload);
          setNotes(Object.fromEntries(payload.reports.map((report) => [report.id, report.resolutionNote ?? ""])));
        }
      })
      .catch((err) => {
        if (!isAbortError(err) && !controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, statusFilter]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const report of data?.reports ?? []) {
      counts.set(report.category, (counts.get(report.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  async function updateStatus(report: ErrorReport, status: ErrorStatus) {
    setUpdatingId(report.id);
    setActionError(false);
    try {
      const response = await fetch(`/api/admin/errors/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify({ status, note: notes[report.id] ?? "" }),
      });
      if (!response.ok) throw new Error("Failed to update error report");

      setData((current) => {
        if (!current) return current;
        if (statusFilter !== "all" && statusFilter !== status) {
          const reports = current.reports.filter((item) => item.id !== report.id);
          return { ...current, reports, total: reports.length };
        }
        return {
          ...current,
          reports: current.reports.map((item) => item.id === report.id
            ? { ...item, status, resolutionNote: notes[report.id] ?? null }
            : item),
        };
      });
    } catch {
      setActionError(true);
    } finally {
      setUpdatingId(null);
    }
  }

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
        <div className="adm-errors-filters">
          <label>
            <span>{t("admin.errors.statusFilter", "Status")}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>{t(`admin.errors.status.${status}`, status)}</option>
              ))}
            </select>
          </label>
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
        </div>
      </header>

      {actionError && (
        <div className="adm-errors-alert" role="alert">
          <AlertTriangle size={16} />
          {t("admin.errors.updateFailed", "Unable to update the error report.")}
        </div>
      )}

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
          <div className="adm-errors-table-wrap">
            <table className="adm-errors-table">
              <thead>
                <tr>
                  <th scope="col">{t("admin.errors.colTime", "Time")}</th>
                  <th scope="col">{t("admin.errors.colCategory", "Category")}</th>
                  <th scope="col">{t("admin.errors.colMessage", "Message")}</th>
                  <th scope="col">{t("admin.errors.colPage", "Page")}</th>
                  <th scope="col">{t("admin.errors.colStatus", "Status")}</th>
                  <th scope="col">{t("admin.errors.colActions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => {
                  const isUpdating = updatingId === report.id;
                  return (
                    <tr key={report.id}>
                      <td>{formatTime(report.occurredAt)}</td>
                      <td><span className={`adm-errors-category adm-errors-category--${report.category}`}>{report.category}</span></td>
                      <td className="adm-errors-message">
                        <strong>{report.message}</strong>
                        <small>{report.source || "-"}</small>
                      </td>
                      <td>{pageFromUrl(report.url)}</td>
                      <td><span className={`adm-errors-status adm-errors-status--${report.status}`}>{t(`admin.errors.status.${report.status}`, report.status)}</span></td>
                      <td>
                        <div className="adm-errors-workflow">
                          <input
                            type="text"
                            maxLength={1000}
                            value={notes[report.id] ?? ""}
                            onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                            placeholder={t("admin.errors.notePlaceholder", "Resolution note")}
                            aria-label={t("admin.errors.noteLabel", "Resolution note")}
                            disabled={isUpdating}
                          />
                          <div className="adm-errors-actions">
                            {report.status === "open" ? (
                              <>
                                <button type="button" onClick={() => updateStatus(report, "resolved")} disabled={isUpdating}>
                                  {isUpdating ? <LoaderCircle className="adm-spin" size={15} /> : <CheckCircle2 size={15} />}
                                  {t("admin.errors.resolve", "Resolve")}
                                </button>
                                <button type="button" onClick={() => updateStatus(report, "ignored")} disabled={isUpdating}>
                                  <EyeOff size={15} /> {t("admin.errors.ignore", "Ignore")}
                                </button>
                              </>
                            ) : (
                              <button type="button" onClick={() => updateStatus(report, "open")} disabled={isUpdating}>
                                {isUpdating ? <LoaderCircle className="adm-spin" size={15} /> : <RotateCcw size={15} />}
                                {t("admin.errors.reopen", "Reopen")}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
