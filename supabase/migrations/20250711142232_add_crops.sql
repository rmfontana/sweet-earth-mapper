create table if not exists crops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  min_brix numeric(5,2),
  max_brix numeric(5,2)
);