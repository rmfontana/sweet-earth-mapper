-- Enable RLS on submission_images table
ALTER TABLE public.submission_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "authenticated_insert_submission_images" ON public.submission_images;
DROP POLICY IF EXISTS "users_read_submission_images" ON public.submission_images;
DROP POLICY IF EXISTS "admin_update_submission_images" ON public.submission_images;
DROP POLICY IF EXISTS "admin_delete_submission_images" ON public.submission_images;

-- Drop existing storage policies
DROP POLICY IF EXISTS "authenticated_insert_submission_images" ON storage.objects;
DROP POLICY IF EXISTS "users_read_submission_images" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_submission_images" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_submission_images" ON storage.objects;

-- Insert Policy: Authenticated users can insert
CREATE POLICY "authenticated_insert_submission_images"
ON public.submission_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Select Policy: Users can read their own or admin can read all
CREATE POLICY "users_read_submission_images"
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

-- Update Policy: Only admins can update
CREATE POLICY "admin_update_submission_images"
ON public.submission_images
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Delete Policy: Only admins can delete
CREATE POLICY "admin_delete_submission_images"
ON public.submission_images
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Storage Policies for submission-images bucket
CREATE POLICY "authenticated_insert_submission_images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
);

CREATE POLICY "users_read_submission_images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket') AND 
  (owner_id::text = auth.uid()::text OR 
   EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "admin_delete_submission_images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket') AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "users_delete_own_submission_images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket') AND 
  owner_id::text = auth.uid()::text
);