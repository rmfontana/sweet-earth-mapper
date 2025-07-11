create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamp with time zone default now(),
  crop_id uuid not null references crops(id),
  location_id uuid not null references locations(id),
  store_id uuid references stores(id),
  brand_id uuid references brands(id),
  label text,
  brix_value numeric(5,2) not null check (brix_value >= 0 and brix_value <= 100)
);
