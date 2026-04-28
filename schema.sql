create table if not exists photos (
  id text primary key,
  title text not null,
  style text not null,
  location text not null,
  object_key text not null,
  image_url text not null,
  alt text not null,
  featured integer not null default 0,
  client_authorized integer not null default 0,
  visibility text not null default 'hidden',
  created_at text not null
);

create index if not exists idx_photos_public
  on photos (visibility, client_authorized, featured, created_at);

create table if not exists cms_content (
  key text primary key,
  value_json text not null,
  updated_at text not null
);
