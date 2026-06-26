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

alter table courses add column price_cents integer default 0;
alter table courses add column price_display text;
alter table courses add column currency text default 'cny';

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

alter table workshops add column price_cents integer default 0;
alter table workshops add column currency text default 'cny';

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
