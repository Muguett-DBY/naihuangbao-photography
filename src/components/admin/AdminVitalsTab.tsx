import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Gauge } from "lucide-react";
import { Loading } from "animal-island-ui";
import { isAbortError } from "../../lib/admin-helpers";

type OverallSummary = {
  metric: string;
  count: number;
  p50: number;
  p75: number;
  p95: number;
  ratings: { good: number; "needs-improvement": number; poor: number };
};

type DailyPoint = {
  date: string;
  metric: string;
  count: number;
  p75: number;
};

type PageSummary = {
  page: string;
  count: number;
  lcp_p75: number;
  inp_p75: number;
  cls_p75: number;
};

type VitalsData = {
  total: number;
  days: number;
  overall: OverallSummary[];
  daily: DailyPoint[];
  pages: PageSummary[];
};

const RANGES: Array<{ key: string; days: number }> = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
];

const RATING_KEYS = ["good", "needs-improvement", "poor"] as const;

function ratingTone(rating: "good" | "needs-improvement" | "poor") {
  if (rating === "good") return "adm-vitals-rating--good";
  if (rating === "needs-improvement") return "adm-vitals-rating--mid";
  return "adm-vitals-rating--poor";
}

function formatValue(metric: string, value: number): string {
  if (metric === "CLS") return value.toFixed(2);
  return `${Math.round(value)} ms`;
}

function formatDate(date: string): string {
  return date.slice(5);
}

function ratingBarPct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

export function AdminVitalsTab() {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<VitalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/admin/vitals?days=${days}`, { credentials: "include", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: VitalsData) => {
        if (!ctrl.signal.aborted) setData(d);
      })
      .catch((error) => {
        if (!isAbortError(error)) console.warn("[admin vitals] failed to load", error);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [days]);

  if (loading && !data) {
    return (
      <div className="adm-content-panel" style={{ position: "relative", minHeight: 250 }}>
        <Loading active />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="adm-content-panel" style={{ textAlign: "center", padding: "40px 20px" }}>
        <p>{t("admin.vitals.noData", "Unable to load performance data")}</p>
      </div>
    );
  }

  return (
    <div className="adm-content-panel">
      <header className="adm-vitals-header">
        <h2>
          <Gauge size={18} /> {t("admin.vitals.title", "Web Vitals")}
        </h2>
        <div className="adm-vitals-range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`adm-vitals-range-btn${days === r.days ? " is-active" : ""}`}
              onClick={() => setDays(r.days)}
            >
              {r.key}
            </button>
          ))}
        </div>
      </header>

      <p className="adm-vitals-meta">
        {t("admin.vitals.totalSamples", "Samples")}: <strong>{data.total}</strong>
      </p>

      {data.total === 0 ? (
        <div className="adm-vitals-empty">
          <Activity size={32} />
          <p>{t("admin.vitals.empty", "No real-user data yet. Once visitors browse the site, metrics will appear here.")}</p>
        </div>
      ) : (
        <>
          <div className="adm-vitals-grid">
            {data.overall.map((m) => (
              <article key={m.metric} className="adm-vitals-card">
                <header className="adm-vitals-card-head">
                  <h3>{m.metric}</h3>
                  <span className="adm-vitals-card-count">{m.count}</span>
                </header>
                <dl className="adm-vitals-card-stats">
                  <div>
                    <dt>p50</dt>
                    <dd>{formatValue(m.metric, m.p50)}</dd>
                  </div>
                  <div>
                    <dt>p75</dt>
                    <dd>{formatValue(m.metric, m.p75)}</dd>
                  </div>
                  <div>
                    <dt>p95</dt>
                    <dd>{formatValue(m.metric, m.p95)}</dd>
                  </div>
                </dl>
                <div className="adm-vitals-rating-bars">
                  {RATING_KEYS.map((rk) => {
                    const count = m.ratings[rk];
                    const pct = ratingBarPct(count, m.count);
                    return (
                      <div key={rk} className="adm-vitals-rating-row">
                        <span className={`adm-vitals-rating-dot ${ratingTone(rk)}`} aria-hidden="true" />
                        <span className="adm-vitals-rating-label">
                          {t(`admin.vitals.ratings.${rk}`, rk)}
                        </span>
                        <div className="adm-vitals-rating-track">
                          <div className={`adm-vitals-rating-fill ${ratingTone(rk)}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="adm-vitals-rating-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          <section className="adm-vitals-section">
            <h3>{t("admin.vitals.dailyTitle", "Daily trend (p75)")}</h3>
            {data.daily.length === 0 ? (
              <p className="adm-vitals-empty-line">{t("admin.vitals.noDaily", "Not enough samples for a trend yet.")}</p>
            ) : (
              <DailyChart points={data.daily} />
            )}
          </section>

          {data.pages.length > 0 && (
            <section className="adm-vitals-section">
              <h3>{t("admin.vitals.pagesTitle", "Top pages")}</h3>
              <table className="adm-vitals-pages-table">
                <thead>
                  <tr>
                    <th scope="col">{t("admin.vitals.colPage", "Page")}</th>
                    <th scope="col">{t("admin.vitals.colSamples", "Samples")}</th>
                    <th scope="col">LCP p75</th>
                    <th scope="col">INP p75</th>
                    <th scope="col">CLS p75</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pages.map((p) => (
                    <tr key={p.page}>
                      <td className="adm-vitals-page-cell">{p.page || "/"}</td>
                      <td>{p.count}</td>
                      <td>{formatValue("LCP", p.lcp_p75)}</td>
                      <td>{formatValue("INP", p.inp_p75)}</td>
                      <td>{formatValue("CLS", p.cls_p75)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DailyChart({ points }: { points: DailyPoint[] }) {
  const { t } = useTranslation();
  const metrics = Array.from(new Set(points.map((p) => p.metric)));
  const dates = Array.from(new Set(points.map((p) => p.date))).sort();

  return (
    <div className="adm-vitals-chart" role="img" aria-label={t("admin.vitals.dailyAria", "Web Vitals daily p75 trend")}>
      <div className="adm-vitals-chart-grid">
        {dates.map((d) => (
          <div key={d} className="adm-vitals-chart-x-label">{formatDate(d)}</div>
        ))}
      </div>
      <div className="adm-vitals-chart-rows">
        {metrics.map((metric) => {
          const series = dates.map((d) => {
            const pt = points.find((p) => p.date === d && p.metric === metric);
            return pt?.p75 ?? 0;
          });
          const max = Math.max(1, ...series);
          return (
            <div key={metric} className="adm-vitals-chart-row">
              <span className="adm-vitals-chart-metric">{metric}</span>
              <div className="adm-vitals-chart-bars">
                {series.map((value, idx) => {
                  const height = Math.max(2, Math.round((value / max) * 36));
                  const date = dates[idx] ?? "";
                  return (
                    <div
                      key={`${metric}-${date}`}
                      className="adm-vitals-chart-bar"
                      style={{ height: `${height}px` }}
                      title={`${formatDate(date)}: ${formatValue(metric, value)}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
