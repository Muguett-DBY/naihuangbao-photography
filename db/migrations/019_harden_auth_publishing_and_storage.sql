alter table users add column session_version integer not null default 0;

create table if not exists published_project_handles (
  slug text primary key,
  owner_user_id text not null,
  project_id text not null,
  latest_version integer not null default 0,
  created_at text not null,
  updated_at text not null,
  foreign key (owner_user_id) references users(id) on delete cascade
);

create index if not exists idx_published_project_handles_owner
  on published_project_handles (owner_user_id, updated_at desc);
