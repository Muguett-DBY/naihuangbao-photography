create table if not exists photo_object_delete_queue (
  object_key text primary key,
  photo_id text,
  attempts integer not null default 0,
  last_error text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists idx_photo_object_delete_queue_updated
  on photo_object_delete_queue (updated_at);
