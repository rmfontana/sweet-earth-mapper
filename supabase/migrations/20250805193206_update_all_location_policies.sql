-- Drop existing policies on locations (optional: clean slate)
DROP POLICY IF EXISTS "Public can read locations" ON public.locations;

-- Allow public (everyone) to SELECT (read)
CREATE POLICY "Public can read locations"
ON public.locations
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to INSERT
CREATE POLICY "Authenticated can insert locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow only admins (based on users.role) to UPDATE
CREATE POLICY "Admins can update locations"
ON public.locations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- Allow only admins (based on users.role) to DELETE
CREATE POLICY "Admins can delete locations"
ON public.locations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);