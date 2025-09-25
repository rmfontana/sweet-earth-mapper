BEGIN;

-- Ensure RLS is enabled (no-op if already enabled)
 ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove the global RESTRICTIVE policy that’s blocking everyone 
DROP POLICY IF EXISTS "deny_all_public_access_to_users" ON public.users;

-- Create a RESTRICTIVE policy ONLY for anon (blocks unauthenticated access; keeps authenticated flows intact) -- Uses pg_policies.policyname (correct column) and is idempotent 
DO $$ BEGIN IF NOT EXISTS ( SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'deny_anon_all_access_to_users' ) THEN EXECUTE $p$ CREATE POLICY "deny_anon_all_access_to_users" ON public.users AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false) $p$; END IF; END $$;

COMMIT;