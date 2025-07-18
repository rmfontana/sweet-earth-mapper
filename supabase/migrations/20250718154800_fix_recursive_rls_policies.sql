-- Fix recursive RLS policies by using auth.jwt() claims instead of querying users table

-- Drop existing problematic policies
drop policy if exists "Users can view their own profile" on users;
drop policy if exists "Users can edit their own profile" on users;
drop policy if exists "Admins can delete any user" on users;
drop policy if exists "Admins can update submissions" on submissions;
drop policy if exists "Admins can delete any submissions" on submissions;

-- Create the is_admin() function first (safe, reads JWT claims)
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select coalesce(
    current_setting('jwt.claims.user_metadata.role', true) = 'admin',
    false
  );
$$;

-- Alternative: Create a function that safely checks user role without recursion
create or replace function public.get_user_role(user_uuid uuid)
returns text
language sql
security definer
as $$
  select role from users where id = user_uuid;
$$;

-- Recreate users policies without recursion
create policy "Users can view their own profile"
  on users for select to authenticated
  using (
    auth.uid() = id
    or public.is_admin()
  );

create policy "Users can edit their own profile"
  on users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can delete any user"
  on users for delete to authenticated
  using (public.is_admin());

-- Recreate submissions admin policies without recursion
create policy "Admins can update submissions"
  on submissions for update to authenticated
  using (public.is_admin());

create policy "Admins can delete any submissions"
  on submissions for delete to authenticated
  using (public.is_admin());

-- Grant necessary permissions
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_user_role(uuid) to authenticated;
