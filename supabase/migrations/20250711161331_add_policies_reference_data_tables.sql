-- Everyone (including anonymous users) can read reference data
create policy "Public can read brands"
  on brands for select
  using (true);

create policy "Public can read crops"
  on crops for select
  using (true);

create policy "Public can read locations"
  on locations for select
  using (true);

create policy "Public can read stores"
  on stores for select
  using (true);