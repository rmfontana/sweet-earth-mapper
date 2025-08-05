-- Submission Images Table: Authenticated users can insert records
DO $$
BEGIN
    CREATE POLICY "Authenticated users can insert submission images"
    ON public.submission_images
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN
    -- Policy already exists, do nothing
    RAISE NOTICE 'Policy already exists, skipping creation';
END $$;

-- Submission Images Table: Authenticated users can read records
DO $$
BEGIN
    CREATE POLICY "Authenticated users can read submission images"
    ON public.submission_images
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM submissions 
        WHERE submissions.id = submission_images.submission_id 
        AND submissions.user_id = auth.uid()
      ) OR 
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Policy already exists, skipping creation';
END $$;

-- Submission Images Table: Admins can update records
DO $$
BEGIN
    CREATE POLICY "Admins can update submission images"
    ON public.submission_images
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Policy already exists, skipping creation';
END $$;

-- Submission Images Table: Admins can delete records
DO $$
BEGIN
    CREATE POLICY "Admins can delete submission images"
    ON public.submission_images
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Policy already exists, skipping creation';
END $$;

-- Submission Images Bucket: Allow authenticated users to insert into submission-images bucket
DO $$
BEGIN
    CREATE POLICY "Authenticated users can insert submission images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Policy already exists, skipping creation';
END $$;

-- Submission Images Bucket: Allow users to read their own submission images or admin access
DO $$
BEGIN
    CREATE POLICY "Users can read submission images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
      AND 
      (
        -- User can view their own uploads
        owner_id::text = (SELECT auth.uid()::text)
        OR
        -- Admins can view all images
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Policy "Users can read submission images" already exists, skipping creation';
END $$;

-- Allow admins to delete submission images
DO $$
BEGIN
    CREATE POLICY "Admins can delete submission images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
      AND 
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Policy "Admins can delete submission images" already exists, skipping creation';
END $$;

-- Allow users to delete their own submission images
DO $$
BEGIN
    CREATE POLICY "Users can delete their own submission images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
      AND 
      owner_id::text = (SELECT auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Policy "Users can delete their own submission images" already exists, skipping creation';
END $$;