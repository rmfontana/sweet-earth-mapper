-- Let anyone view submissions
create policy "Public can read submissions"
  on submissions for select
  using (true);

-- Only authenticated users can insert
create policy "Authenticated users can insert submissions"
  on submissions for insert to authenticated
  with check (auth.uid() = user_id);

-- Policy: Allow users to update their own submissions or if they're admin
create policy "Users can update their own submissions"
  on submissions for update to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Policy: Allow users to delete their own submissions or if they're admin
create policy "Users can delete their own submissions"
  on submissions for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );