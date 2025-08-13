-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can insert their profile" ON public.users;

-- Create a policy that allows service role to insert (for edge functions)
CREATE POLICY "Enable insert for service role and authenticated users" ON public.users
    FOR INSERT
    TO service_role, authenticated
    WITH CHECK (true);