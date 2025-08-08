DROP POLICY IF EXISTS "Users can insert their profile" ON public.users;

CREATE POLICY "Users can insert their profile"
ON public.users
FOR INSERT
TO public 
WITH CHECK (
  auth.uid() = id AND display_name IS NOT NULL
);