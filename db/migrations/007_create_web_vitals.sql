-- Web Vitals real-user-monitoring (RUM)
-- Captures LCP, INP, CLS, FCP, TTFB reported by client browsers
-- Aggregated client-side to keep payload small; server stores raw + per-day stats
create table if not exists web_vitals (
  id integer primary key autoincrement,
  metric text not null,
  value real not null,
  rating text not null,
  page text not null,
  connection_type text,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_web_vitals_metric_time
  on web_vitals (metric, created_at);

create index if not exists idx_web_vitals_page_metric
  on web_vitals (page, metric, created_at);
