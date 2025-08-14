-- Drop the existing 'users_read_submission_images' policy if it exists.
-- This is important to avoid conflicts or duplicate policies if it was misconfigured previously.
DROP POLICY IF EXISTS "users_read_submission_images" ON storage.objects;

-- Create a new RLS policy to allow anonymous users to SELECT (read) objects
-- from the 'submission-images-bucket'.
-- The 'to anon' clause is crucial for granting public access without authentication.
CREATE POLICY "Public access for submission images"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'submission-images-bucket');