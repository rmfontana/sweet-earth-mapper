-- Create a function to sync auth.users into your custom public.users table
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, created_at)
  values (new.id, new.email, now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to call the function after a new user is inserted in auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
