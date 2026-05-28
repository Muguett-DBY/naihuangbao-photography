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

-- ── New business line tables ──

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
  price_display text,
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
