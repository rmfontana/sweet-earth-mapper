-- Remove the conflicting permissive SELECT policy for public role
-- This policy conflicts with the restrictive policy we added
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Remove the duplicate UPDATE policy for public role 
-- We already have the authenticated role policy for this
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Add a comment to document why we only allow authenticated users
COMMENT ON POLICY "Users can view their own profile" ON public.users IS 'Authenticated users can view their own profile data';
COMMENT ON POLICY "deny_all_public_access_to_users" ON public.users IS 'Restrictive policy to explicitly deny all public access to user data';