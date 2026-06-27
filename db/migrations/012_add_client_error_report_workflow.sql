-- Add admin workflow fields for client-side error reports.
alter table client_error_reports add column status text not null default 'open';
alter table client_error_reports add column resolution_note text;
alter table client_error_reports add column resolved_at text;
alter table client_error_reports add column resolved_by text;
alter table client_error_reports add column updated_at text not null default (datetime('now'));

create index if not exists idx_client_error_reports_status
  on client_error_reports (status, occurred_at);
