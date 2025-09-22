-- Fix the is_admin function to check the users table instead of JWT metadata
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Create a more generic function for role checking
CREATE OR REPLACE FUNCTION public.has_user_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = required_role
  );
$$;

-- Add an index on users.role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- The existing RLS policies are actually correct! 
-- They allow users to see their own profile OR if they're admin
-- The issue was just the broken is_admin() function
