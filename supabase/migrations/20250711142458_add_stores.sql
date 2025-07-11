create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_id uuid references locations(id)
);