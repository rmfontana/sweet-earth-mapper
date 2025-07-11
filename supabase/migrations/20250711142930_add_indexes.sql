create index if not exists submissions_crop_id_idx on submissions(crop_id);
create index if not exists submissions_location_id_idx on submissions(location_id);
create index if not exists submissions_timestamp_idx on submissions(timestamp);
create index if not exists submissions_brix_value_idx on submissions(brix_value);

create index if not exists submissions_composite_idx
  on submissions(location_id, crop_id, timestamp);
