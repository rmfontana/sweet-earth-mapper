-- Drop the existing insert policy
DROP POLICY IF EXISTS "authenticated_insert_submission_images" ON storage.objects;

-- Create a simpler insert policy
CREATE POLICY "authenticated_insert_submission_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
);

-- Let's also fix the SELECT policy to be more permissive for testing
DROP POLICY IF EXISTS "users_read_submission_images" ON storage.objects;

CREATE POLICY "users_read_submission_images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
);