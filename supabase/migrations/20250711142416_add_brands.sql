create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);