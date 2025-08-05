-- Drop the existing policy
DROP POLICY IF EXISTS "authenticated_insert_submission_images" ON storage.objects;

-- Create a simpler policy using string functions instead of foldername()
CREATE POLICY "authenticated_insert_submission_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'submission-images-bucket')
  AND auth.uid() IS NOT NULL
  AND name LIKE (auth.uid()::text || '/%')
);