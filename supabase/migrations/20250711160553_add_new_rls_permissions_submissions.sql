alter table submissions enable row level security;

-- Public can only read verified submissions
create policy "Public can read verified submissions"
  on submissions for select
  using (verified = true);

-- Authenticated users can read their own submissions (verified or not)
create policy "Users can read their own submissions"
  on submissions for select to authenticated
  using (auth.uid() = user_id);

-- Authenticated users can insert submissions only for themselves
create policy "Authenticated users can insert submissions"
  on submissions for insert to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own submissions (except verification flag)
create policy "Users can update their own submissions"
  on submissions for update to authenticated
  using (
    auth.uid() = user_id
    and verified = false
  )
  with check (
    auth.uid() = user_id
    and verified = false
  );

-- Admins can update submissions (including verification)
create policy "Admins can update submissions"
  on submissions for update to authenticated
  using (
    exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Users can delete their own submissions only if not verified yet
create policy "Users can delete their own submissions"
  on submissions for delete to authenticated
  using (
    auth.uid() = user_id
    and verified = false
  );

-- Admins can delete any submissions
create policy "Admins can delete any submissions"
  on submissions for delete to authenticated
  using (
    exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );
