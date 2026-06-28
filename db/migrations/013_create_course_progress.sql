create table if not exists course_progress (
  user_id text not null,
  course_id text not null,
  completed_modules text not null default '[]',
  updated_at text not null,
  primary key (user_id, course_id),
  foreign key (user_id) references users(id) on delete cascade,
  foreign key (course_id) references courses(id) on delete cascade
);

create index if not exists idx_course_progress_course
  on course_progress (course_id, updated_at);
