-- Client-side error reports persisted from /api/analytics/error
create table if not exists client_error_reports (
  id text primary key,
  message text not null,
  category text not null default 'manual',
  source text,
  url text,
  user_agent text,
  stack text,
  metadata_json text not null default '{}',
  occurred_at text not null,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_client_error_reports_time
  on client_error_reports (occurred_at);

create index if not exists idx_client_error_reports_category
  on client_error_reports (category, occurred_at);
