create table if not exists synced_workspace_projects (
  user_id text not null,
  project_id text not null,
  revision integer not null,
  content_hash text not null,
  object_key text not null,
  updated_at text not null,
  primary key (user_id, project_id),
  foreign key (user_id) references users(id) on delete cascade
);

create table if not exists workspace_project_versions (
  id text primary key,
  user_id text not null,
  project_id text not null,
  revision integer not null,
  content_hash text not null,
  object_key text not null,
  created_at text not null,
  unique (user_id, project_id, revision),
  foreign key (user_id) references users(id) on delete cascade
);

create table if not exists synced_vault_assets (
  user_id text not null,
  asset_id text not null,
  object_key text not null,
  content_type text not null,
  size integer not null,
  updated_at text not null,
  primary key (user_id, asset_id),
  foreign key (user_id) references users(id) on delete cascade
);

create index if not exists idx_workspace_project_versions_project
  on workspace_project_versions (user_id, project_id, revision desc);

create index if not exists idx_synced_workspace_projects_updated
  on synced_workspace_projects (user_id, updated_at desc);
