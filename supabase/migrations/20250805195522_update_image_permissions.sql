-- Submission Images Table: Authenticated users can insert records
CREATE POLICY "Authenticated users can insert submission images"
ON public.submission_images
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Submission Images Table: Authenticated users can read records
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

-- Submission Images Table: Admins can update records
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

-- Submission Images Table: Admins can delete records
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

-- Storage Objects: Authenticated users can upload files to submission-images-bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-images-bucket' AND
  auth.uid() IS NOT NULL
);

-- Storage Objects: Authenticated users can read files in submission-images-bucket
CREATE POLICY "Authenticated users can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-images-bucket' AND
  (
    -- User can read their own submission images
    EXISTS (
      SELECT 1 FROM public.submission_images si
      JOIN public.submissions s ON si.submission_id = s.id
      WHERE si.image_url = storage.objects.name AND s.user_id = auth.uid()
    ) OR 
    -- Admins can read all files
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Storage Objects: Admins can update files
CREATE POLICY "Admins can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submission-images-bucket' AND
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Storage Objects: Admins can delete files
CREATE POLICY "Admins can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-images-bucket' AND
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);