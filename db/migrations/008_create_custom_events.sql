-- Custom client-side event tracking (track())
create table if not exists custom_events (
  id integer primary key autoincrement,
  event text not null,
  session_id text,
  metadata_json text not null default '{}',
  page text,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_custom_events_event_time
  on custom_events (event, created_at);

create index if not exists idx_custom_events_session
  on custom_events (session_id, created_at);
