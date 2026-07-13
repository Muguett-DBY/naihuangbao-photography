alter table booking_requests add column user_id text references users(id) on delete set null;
create index if not exists idx_booking_requests_user
  on booking_requests (user_id, created_at);

alter table booking_waitlist add column user_id text references users(id) on delete set null;
create index if not exists idx_booking_waitlist_user
  on booking_waitlist (user_id, active, created_at);

alter table workshop_registrations add column user_id text references users(id) on delete set null;
create index if not exists idx_workshop_registrations_user
  on workshop_registrations (user_id, created_at);
