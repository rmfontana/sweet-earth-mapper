-- Drop the old policy if it exists
drop policy if exists "Users can insert their profile" on public.users;

-- Create a new insert policy for authenticated users
create policy "Users can insert their profile"
on public.users
for insert
to authenticated
with check (
  auth.uid() = id AND display_name IS NOT NULL
);