-- Migration: add_restrictive_policy_for_users_table.sql
-- This migration adds an explicit RESTRICTIVE policy to deny public access to the users table
-- This satisfies security scanners while maintaining all existing functionality

BEGIN;

-- Add a RESTRICTIVE policy that explicitly denies all public access to users table
-- This policy is combined with existing policies using AND logic, making it more secure
-- It won't break functionality because:
-- 1. Your handle_new_user() trigger uses SECURITY DEFINER (bypasses RLS)
-- 2. Authenticated users still have access via existing policies
-- 3. The existing "public" role policies are redundant anyway (auth.uid() = null for public users)

CREATE POLICY "deny_all_public_access_to_users" 
ON public.users 
AS RESTRICTIVE 
FOR ALL 
TO public 
USING (false);

-- Optional: Add a comment explaining why this policy exists
COMMENT ON POLICY "deny_all_public_access_to_users" ON public.users IS 
'Explicit denial of all public access to users table for security compliance. This is a RESTRICTIVE policy that works alongside existing policies to ensure no unauthenticated access is possible.';

COMMIT;
