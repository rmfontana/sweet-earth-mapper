alter table users enable row level security;

-- Users can view own profile or admin can view all
create policy "Users can view their own profile"
  on users for select to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Users can update own profile
create policy "Users can edit their own profile"
  on users for update to authenticated
  using (
    auth.uid() = id
  );

-- Admins can delete any user
create policy "Admins can delete any user"
  on users for delete to authenticated
  using (
    exists (
      select 1 from users u where u.id = auth.uid() and u.role = 'admin'
    )
  );
