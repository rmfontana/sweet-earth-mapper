create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  place_id text,
  geom geography(Point,4326)
);