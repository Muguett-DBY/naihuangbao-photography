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
  album text,
  video_url text,
  note_url text,
  created_at text not null
);

create index if not exists idx_photos_public
  on photos (visibility, client_authorized, featured, created_at);

create table if not exists cms_content (
  key text primary key,
  value_json text not null,
  updated_at text not null
);

create table if not exists chat_rate_limits (
  ip_hash text not null,
  window_start integer not null,
  count integer not null default 0,
  updated_at text not null,
  primary key (ip_hash, window_start)
);

create index if not exists idx_chat_rate_limits_updated
  on chat_rate_limits (updated_at);

create table if not exists booking_requests (
  id text primary key,
  package_name text not null,
  preferred_date text,
  preferred_time text,
  name text not null,
  contact text not null,
  notes text not null default '',
  status text not null default 'pending',
  created_at text not null
);

create index if not exists idx_booking_status
  on booking_requests (status, created_at);

-- â”€â”€ New business line tables â”€â”€

create table if not exists courses (
  id text primary key,
  title text not null,
  title_en text,
  title_ko text,
  title_ja text,
  description text,
  description_en text,
  description_ko text,
  description_ja text,
  cover_image_url text,
  video_url text,
  content_markdown text,
  category text not null default 'beginner',
  difficulty text not null default 'beginner',
  duration_minutes integer,
  price_cents integer default 0,
  price_display text,
  currency text default 'cny',
  sort_order integer default 0,
  published integer default 0,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_courses_published
  on courses (published, sort_order, created_at);

create table if not exists course_modules (
  id text primary key,
  course_id text not null,
  title text not null,
  title_en text,
  title_ko text,
  title_ja text,
  type text not null default 'text',
  content text,
  sort_order integer default 0,
  foreign key (course_id) references courses(id) on delete cascade
);

create index if not exists idx_course_modules_course
  on course_modules (course_id, sort_order);

create table if not exists presets (
  id text primary key,
  name text not null,
  name_en text,
  name_ko text,
  name_ja text,
  description text,
  description_en text,
  description_ko text,
  description_ja text,
  category text not null default 'lightroom',
  preview_images text default '[]',
  download_url text,
  price_display text,
  featured integer default 0,
  download_count integer default 0,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_presets_category
  on presets (category, featured, created_at);

create table if not exists workshops (
  id text primary key,
  title text not null,
  title_en text,
  title_ko text,
  title_ja text,
  description text,
  description_en text,
  description_ko text,
  description_ja text,
  cover_image_url text,
  event_date text not null,
  event_time text,
  location text,
  max_participants integer,
  current_participants integer default 0,
  price_cents integer default 0,
  price_display text,
  currency text default 'cny',
  status text default 'upcoming',
  registration_form_url text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_workshops_status
  on workshops (status, event_date);

create table if not exists workshop_registrations (
  id text primary key,
  workshop_id text not null,
  name text not null,
  contact text not null,
  participants integer default 1,
  notes text,
  status text default 'pending',
  created_at text not null,
  foreign key (workshop_id) references workshops(id) on delete cascade
);

create index if not exists idx_workshop_registrations
  on workshop_registrations (workshop_id, status);

create table if not exists merchandise (
  id text primary key,
  name text not null,
  name_en text,
  name_ko text,
  name_ja text,
  description text,
  description_en text,
  description_ko text,
  description_ja text,
  images text default '[]',
  category text not null default 'other',
  price_display text,
  available integer default 1,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_merchandise_category
  on merchandise (category, available, created_at);

-- â”€â”€ Auth tables â”€â”€

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

create table if not exists subscribers (
  id text primary key,
  email text not null unique,
  subscribed_at text not null,
  active integer not null default 1
);

create index if not exists idx_subscribers_email
  on subscribers (email);

create table if not exists payment_intents (
  id text primary key,
  purpose text not null,
  reference_id text not null,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'pending',
  provider text not null,
  client_secret text not null,
  metadata text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_payment_intents_reference
  on payment_intents (purpose, reference_id, created_at);

create table if not exists payment_refunds (
  id text primary key,
  payment_intent_id text not null,
  charge_id text not null,
  amount_cents integer,
  currency text,
  status text not null default 'refunded',
  raw_event_type text not null,
  received_at text not null,
  metadata text,
  created_at text not null,
  updated_at text not null,
  unique (charge_id),
  foreign key (payment_intent_id) references payment_intents(id)
);

create index if not exists idx_payment_refunds_intent
  on payment_refunds (payment_intent_id, received_at);

create table if not exists course_purchases (
  id text primary key,
  course_id text not null,
  user_id text not null,
  payment_intent_id text not null,
  progress integer not null default 0,
  created_at text not null,
  unique (course_id, user_id),
  foreign key (course_id) references courses(id) on delete cascade,
  foreign key (user_id) references users(id) on delete cascade,
  foreign key (payment_intent_id) references payment_intents(id)
);

create index if not exists idx_course_purchases_user
  on course_purchases (user_id, created_at);

create table if not exists purchases (
  id text primary key,
  user_id text not null,
  item_type text not null,
  item_id text not null,
  item_name text not null,
  price_cents integer not null,
  payment_intent_id text,
  created_at text not null,
  foreign key (user_id) references users(id) on delete cascade,
  foreign key (payment_intent_id) references payment_intents(id)
);

create index if not exists idx_purchases_user
  on purchases (user_id, created_at);

create table if not exists password_reset_tokens (
  id text primary key,
  user_id text not null,
  token_hash text not null,
  expires_at text not null,
  used integer not null default 0,
  created_at text not null,
  foreign key (user_id) references users(id) on delete cascade
);

create index if not exists idx_password_reset_tokens_user
  on password_reset_tokens (user_id, used, expires_at);

-- â”€â”€ Web Vitals RUM â”€â”€

create table if not exists web_vitals (
  id integer primary key autoincrement,
  metric text not null,
  value real not null,
  rating text not null,
  page text not null,
  connection_type text,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_web_vitals_metric_time
  on web_vitals (metric, created_at);

create index if not exists idx_web_vitals_page_metric
  on web_vitals (page, metric, created_at);

-- â”€â”€ Custom event tracking â”€â”€

create table if not exists custom_events (
  id integer primary key autoincrement,
  event text not null,
  session_id text,
  metadata_json text not null default '{}',
  page text,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_custom_events_event_time
  on custom_events (event, created_at);

create index if not exists idx_custom_events_session
  on custom_events (session_id, created_at);

-- â”€â”€ Admin audit log â”€â”€

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

-- ©¤©¤ Share links ©¤©¤

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

-- ©¤©¤ Booking waitlist ©¤©¤

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
