create table if not exists published_projects (
  id text primary key,
  slug text not null,
  project_id text not null,
  version integer not null,
  title text not null,
  object_key text not null,
  content_hash text not null,
  published_at text not null,
  unique(slug, version)
);

create index if not exists idx_published_projects_slug_version
  on published_projects(slug, version desc);

create index if not exists idx_published_projects_project
  on published_projects(project_id, published_at desc);
