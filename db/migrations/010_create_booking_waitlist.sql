-- Booking waitlist for full date notifications
create table if not exists booking_waitlist (
  id text primary key,
  token text not null unique,
  preferred_date text not null,
  contact text not null,
  name text not null,
  package_name text,
  active integer not null default 1,
  notified integer not null default 0,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_booking_waitlist_date
  on booking_waitlist (preferred_date, active);

create index if not exists idx_booking_waitlist_token
  on booking_waitlist (token);
