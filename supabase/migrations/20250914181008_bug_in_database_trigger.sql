-- COMPLETE FIX FOR ROLE CONSTRAINT VIOLATION

-- Step 1: Fix the table default to use 'contributor' (which is allowed)
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'contributor';

-- Step 2: Clean up any existing 'user' roles (safeguard)
UPDATE public.users SET role = 'contributor' WHERE role = 'user';

-- Step 3: Create the corrected trigger function (no role insertion - let default handle it)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    display_name,
    country,
    state,
    city
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'city'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 4: Ensure only one trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify the setup
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name = 'role';

-- Step 6: Check constraint details
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_role_check';

-- Step 7: Test that the trigger function can be called
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';