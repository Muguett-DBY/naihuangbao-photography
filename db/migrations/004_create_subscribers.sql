create table if not exists subscribers (
  id text primary key,
  email text not null unique,
  subscribed_at text not null,
  active integer not null default 1
);

create index if not exists idx_subscribers_email
  on subscribers (email);
