-- This script safely drops existing RLS policies and re-creates them
-- for all tables, ensuring a consistent and correct security setup.

-- Use the transaction block to ensure all changes are applied together or rolled back on error.
BEGIN;

-- Step 1: Drop all existing RLS policies on the tables to be modified.
-- This is a safe way to start with a clean slate for policy creation.
-- The IF EXISTS clause prevents errors if a policy doesn't exist.
DROP POLICY IF EXISTS "Allow authenticated users to read brands" ON public.brands;
DROP POLICY IF EXISTS "Allow contributors to insert brands" ON public.brands;
DROP POLICY IF EXISTS "Public can read brands" ON public.brands;

DROP POLICY IF EXISTS "Public can read crops" ON public.crops;

DROP POLICY IF EXISTS "Admins can delete locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can update locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Public can read locations" ON public.locations;

-- Drop the policies on the new tables that might already exist.
DROP POLICY IF EXISTS "Public can read stores" ON public.stores;
DROP POLICY IF EXISTS "Contributors and admins can insert stores" ON public.stores;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Contributors and admins can insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON public.submissions;


DROP POLICY IF EXISTS "Admins can delete submission images" ON public.submission_images;
DROP POLICY IF EXISTS "Admins can update submission images" ON public.submission_images;
DROP POLICY IF EXISTS "Allow insert if user owns submission" ON public.submission_images;
DROP POLICY IF EXISTS "Allow select if user owns submission" ON public.submission_images;
DROP POLICY IF EXISTS "Authenticated users can insert submission images" ON public.submission_images;
DROP POLICY IF EXISTS "Authenticated users can read submission images" ON public.submission_images;
DROP POLICY IF EXISTS "admin_delete_submission_images" ON public.submission_images;

-- Step 2: Enable Row Level Security for all tables.
-- The previous migration might have disabled RLS on stores and submissions.
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_images ENABLE ROW LEVEL SECURITY;

--
-- Step 3: Create RLS policies for the new 'stores' table.
--

-- Allow all authenticated users to read stores, as it's a public master list.
CREATE POLICY "Public can read stores" ON public.stores
  FOR SELECT TO public
  USING (true);

-- Allow authenticated users with 'contributor' or 'admin' roles to insert stores.
CREATE POLICY "Contributors and admins can insert stores" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('contributor', 'admin'))
  );

--
-- Step 4: Re-create RLS policies for 'brands' based on your previous configuration.
--

-- Allow authenticated users to read all brands.
CREATE POLICY "Allow authenticated users to read brands" ON public.brands
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users with 'contributor' or 'admin' roles to insert new brands.
CREATE POLICY "Contributors and admins can insert brands" ON public.brands
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('contributor', 'admin'))
  );

--
-- Step 5: Re-create RLS policies for 'crops' and 'locations' based on your previous configuration.
--

-- Public can read all crops.
CREATE POLICY "Public can read crops" ON public.crops
  FOR SELECT TO public
  USING (true);

-- Public can read all locations.
CREATE POLICY "Public can read locations" ON public.locations
  FOR SELECT TO public
  USING (true);

-- Authenticated users can insert new locations.
CREATE POLICY "Authenticated can insert locations" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only admins can update locations.
CREATE POLICY "Admins can update locations" ON public.locations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Only admins can delete locations.
CREATE POLICY "Admins can delete locations" ON public.locations
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

--
-- Step 6: Create new RLS policies for the 'submissions' table.
-- These are based on the logic of your submission_images policies.
--

-- Users can only see their own submissions.
CREATE POLICY "Users can view their own submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all submissions.
CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Contributors and Admins can insert new submissions.
CREATE POLICY "Contributors and admins can insert submissions" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND (u.role = 'contributor' OR u.role = 'admin')
    )
  );

-- Only admins can update submissions.
CREATE POLICY "Admins can update submissions" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Only admins can delete submissions.
CREATE POLICY "Admins can delete submissions" ON public.submissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

--
-- Step 7: Re-create RLS policies for 'submission_images' based on your previous configuration.
--

-- Authenticated users can read submission images if they own the submission or if they are an admin.
CREATE POLICY "Authenticated users can read submission images" ON public.submission_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_images.submission_id AND s.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Only admins can delete submission images.
CREATE POLICY "Admins can delete submission images" ON public.submission_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Authenticated users can insert submission images.
CREATE POLICY "Authenticated users can insert submission images" ON public.submission_images
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Commit the transaction to apply all changes.
COMMIT;
