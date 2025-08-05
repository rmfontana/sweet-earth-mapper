-- Remove the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "authenticated_insert_submission_images" ON storage.objects;

-- Create a new INSERT policy that works correctly
CREATE POLICY "users_insert_own_submission_images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'submission-images-bucket' 
  AND auth.uid() IS NOT NULL 
  AND name LIKE (auth.uid()::text || '/%')
);

-- Also make sure you have the correct SELECT policy
DROP POLICY IF EXISTS "users_read_submission_images" ON storage.objects;

CREATE POLICY "users_read_submission_images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'submission-images-bucket'
);

-- And make sure you have UPDATE/DELETE policies if needed
CREATE POLICY "users_update_own_submission_images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'submission-images-bucket' 
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'submission-images-bucket' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "users_delete_own_submission_images" ON storage.objects;
CREATE POLICY "users_delete_own_submission_images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'submission-images-bucket' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);