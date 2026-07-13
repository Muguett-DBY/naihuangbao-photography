-- Persist best-effort admin mutation audit events in existing deployments.
create table if not exists admin_audit_log (
  id integer primary key autoincrement,
  action text not null,
  entity_type text not null,
  entity_id text,
  admin_user text not null default 'admin',
  diff_json text not null default '{}',
  created_at text not null default (datetime('now'))
);

create index if not exists idx_admin_audit_log_action
  on admin_audit_log (action, created_at);

create index if not exists idx_admin_audit_log_entity
  on admin_audit_log (entity_type, entity_id, created_at);
