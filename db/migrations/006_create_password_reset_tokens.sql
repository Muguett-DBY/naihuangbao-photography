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
