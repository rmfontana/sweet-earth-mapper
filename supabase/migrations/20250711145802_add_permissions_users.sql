-- Policy: Allow users to view their own profile
create policy "Users can view their own profile"
  on users for select to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Policy: Allow users to edit their own profile
create policy "Users can edit their own profile"
  on users for update to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );