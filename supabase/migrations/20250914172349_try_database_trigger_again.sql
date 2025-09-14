-- This script safely sets up a database trigger to create a user profile
-- in the 'public.users' table immediately after a new user signs up via Supabase Auth.
-- Run this in your Supabase SQL Editor as a one-time migration.
-- -- Step 1: Create the handle_new_user function. -- This function is triggered by an INSERT on auth.users and securely -- inserts a new row into the public.users table using the data from the new auth user. -- It uses SECURITY DEFINER to allow it to write to the users table even if -- the user's RLS policies would normally prevent it.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
-- Insert a new row into the public.users table.
-- The COALESCE function safely handles cases where display_name might be missing
-- from the user's metadata, falling back to a default value from their email.
INSERT INTO public.users (
id,
display_name,
role,
country,
state,
city
)
VALUES (
NEW.id,
COALESCE(
NEW.raw_user_meta_data->>'display_name',
split_part(NEW.email, '@', 1)
),
'user',
NEW.raw_user_meta_data->>'country',
NEW.raw_user_meta_data->>'state',
NEW.raw_user_meta_data->>'city'
);

RETURN NEW;
EXCEPTION
WHEN others THEN
-- Log a warning but don't fail the entire transaction.
-- This ensures the user is still created even if the profile insert fails for some reason.
RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
RETURN NEW;
END;
$$;
-- -- Step 2: Create the trigger on_auth_user_created. -- This trigger executes the handle_new_user function AFTER a row is INSERTED -- into the auth.users table.

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- -- Step 3: Ensure the public.users table and RLS policies are correctly configured. -- This is crucial for security. RLS prevents users from accessing other users' profiles.

-- Ensure the users table has an RLS policy that allows authenticated users to read and update their own profiles.
-- The RLS policy for INSERT is handled by the trigger function.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies with the same name to avoid duplicates.
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable all access for admin user." on public.users;

-- Policy to allow users to select (read) their own profile.
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

-- Policy to allow users to update their own profile.
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Although the trigger handles the initial insert, this RLS policy ensures
-- no user can insert a profile for a different user.
CREATE POLICY "Enable insert for authenticated users only" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);