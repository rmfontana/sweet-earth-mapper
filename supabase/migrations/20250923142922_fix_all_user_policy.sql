-- 1. Drop ALL existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;  
DROP POLICY IF EXISTS "Users can edit their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user profile creation" ON public.users;
DROP POLICY IF EXISTS "Admins can delete any user" ON public.users;

-- 2. Create clean, explicit policies
-- Policy for service_role (registration triggers)
CREATE POLICY "service_role_full_access" ON public.users
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Policy for authenticated users to view their own profile
CREATE POLICY "users_select_own_profile" ON public.users
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Policy for authenticated users to update their own profile  
CREATE POLICY "users_update_own_profile" ON public.users
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Policy for authenticated users to insert their own profile (manual registration)
CREATE POLICY "users_insert_own_profile" ON public.users
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Admin policies (if is_admin() function exists)
CREATE POLICY "admin_full_access" ON public.users
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());
