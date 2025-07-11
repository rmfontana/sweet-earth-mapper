-- Users metadata table (extends auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  display_name text,
  role text check (role in ('admin', 'contributor', 'viewer')) default 'contributor',
  points int default 0,
  submission_count int default 0,
  last_submission timestamptz
);