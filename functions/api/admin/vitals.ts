import { isAdminRequest } from "../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../_responses";

type EnvWithDB = Env & { ADMIN_PASSWORD?: string };

type VitalsSummary = {
  metric: string;
  count: number;
  p50: number;
  p75: number;
  p95: number;
  ratings: { good: number; "needs-improvement": number; poor: number };
};

type VitalsDaily = {
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

/**
 * GET /api/admin/vitals?days=7
 * Returns aggregated Web Vitals for the admin dashboard.
 * - overall: per-metric percentiles over the window
 * - daily: per-day, per-metric p75 for sparklines
 * - pages: per-page summary (top 10)
 */
export const onRequestGet: PagesFunction<EnvWithDB> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  const url = new URL(context.request.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") ?? 7)));

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ overall: [], daily: [], pages: [], total: 0, days });
  }

  try {
    const totalsRow = await db
      .prepare(`select count(*) as c from web_vitals where created_at >= datetime('now', ?)`)
      .bind(`-${days} days`)
      .first<{ c: number }>();

    const metricRows = await db
      .prepare(
        `select metric, value, rating
         from web_vitals
         where created_at >= datetime('now', ?)`,
      )
      .bind(`-${days} days`)
      .all<{ metric: string; value: number; rating: string }>();

    const overall: VitalsSummary[] = aggregateMetrics(metricRows.results ?? []);

    const dailyRows = await db
      .prepare(
        `select date(created_at) as date, metric, value
         from web_vitals
         where created_at >= datetime('now', ?)`,
      )
      .bind(`-${days} days`)
      .all<{ date: string; metric: string; value: number }>();

    const daily = aggregateDaily(dailyRows.results ?? []);

    const pageRows = await db
      .prepare(
        `select page,
                count(*) as count,
                avg(case when metric = 'LCP' then value end) as lcp_p75,
                avg(case when metric = 'INP' then value end) as inp_p75,
                avg(case when metric = 'CLS' then value end) as cls_p75
         from web_vitals
         where created_at >= datetime('now', ?)
         group by page
         order by count desc
         limit 10`,
      )
      .bind(`-${days} days`)
      .all<PageSummary>();

    return jsonResponse({
      total: totalsRow?.c ?? 0,
      days,
      overall,
      daily,
      pages: pageRows.results ?? [],
    });
  } catch (error) {
    return unavailable("加载性能数据失败", error, { route: "/api/admin/vitals", method: "GET" });
  }
};

function aggregateMetrics(rows: { metric: string; value: number; rating: string }[]): VitalsSummary[] {
  const byMetric = new Map<string, { values: number[]; ratings: { good: number; "needs-improvement": number; poor: number } }>();
  for (const r of rows) {
    let bucket = byMetric.get(r.metric);
    if (!bucket) {
      bucket = { values: [], ratings: { good: 0, "needs-improvement": 0, poor: 0 } };
      byMetric.set(r.metric, bucket);
    }
    bucket.values.push(r.value);
    if (r.rating in bucket.ratings) {
      bucket.ratings[r.rating as keyof typeof bucket.ratings] += 1;
    }
  }
  return Array.from(byMetric.entries())
    .map(([metric, data]) => ({
      metric,
      count: data.values.length,
      p50: percentile(data.values, 0.5),
      p75: percentile(data.values, 0.75),
      p95: percentile(data.values, 0.95),
      ratings: data.ratings,
    }))
    .sort((a, b) => a.metric.localeCompare(b.metric));
}

function aggregateDaily(rows: { date: string; metric: string; value: number }[]): VitalsDaily[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const key = `${r.date}|${r.metric}`;
    let values = groups.get(key);
    if (!values) {
      values = [];
      groups.set(key, values);
    }
    values.push(r.value);
  }
  return Array.from(groups.entries())
    .map(([key, values]) => {
      const [date, metric] = key.split("|");
      return { date: date ?? "", metric: metric ?? "", count: values.length, p75: percentile(values, 0.75) };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return Math.round((sorted[idx] ?? 0) * 100) / 100;
}
