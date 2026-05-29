create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  salt text not null,
  display_name text not null,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_users_email
  on users (email);
