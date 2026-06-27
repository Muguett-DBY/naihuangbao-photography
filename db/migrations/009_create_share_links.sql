-- Share links for photos/albums/gallery with privacy controls
create table if not exists share_links (
  id text primary key,
  token text not null unique,
  resource_type text not null,
  resource_id text not null,
  visibility text not null default 'public',
  password_hash text,
  max_views integer,
  view_count integer not null default 0,
  expires_at text,
  created_at text not null default (datetime('now')),
  created_by text
);

create index if not exists idx_share_links_token
  on share_links (token);

create index if not exists idx_share_links_resource
  on share_links (resource_type, resource_id, created_at);

create index if not exists idx_share_links_expires
  on share_links (expires_at);
