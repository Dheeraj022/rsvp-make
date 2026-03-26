-- Allow all authenticated users to read their own record from the shared users table
DROP POLICY IF EXISTS "Users can view their own metadata" ON public.users;
CREATE POLICY "Users can view their own metadata" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Ensure all authenticated users can update their own metadata (full_name)
DROP POLICY IF EXISTS "Users can update their own metadata" ON public.users;
CREATE POLICY "Users can update their own metadata" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);
