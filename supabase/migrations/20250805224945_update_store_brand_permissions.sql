-- Allow all authenticated users to read brands
CREATE POLICY "Allow authenticated users to read brands" ON public.brands
  FOR SELECT TO authenticated
  USING (true);

-- Allow contributors and admins to insert brands
CREATE POLICY "Allow contributors to insert brands" ON public.brands
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        (auth.users.raw_user_meta_data->>'role') = 'contributor' OR
        (auth.users.raw_user_meta_data->>'role') = 'admin'
      )
    )
  );

-- Allow all authenticated users to read stores
CREATE POLICY "Allow authenticated users to read stores" ON public.stores
  FOR SELECT TO authenticated
  USING (true);

-- Allow contributors and admins to insert stores
CREATE POLICY "Allow contributors to insert stores" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        (auth.users.raw_user_meta_data->>'role') = 'contributor' OR
        (auth.users.raw_user_meta_data->>'role') = 'admin'
      )
    )
  );