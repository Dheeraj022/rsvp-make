-- Run this SQL in the Supabase SQL Editor to allow coordinators to self-register
-- This enables new users to insert their own row in the coordinators table

-- Allow authenticated users to insert into coordinators (for self-signup)
CREATE POLICY "Allow authenticated users to insert coordinator record"
ON coordinators
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow coordinators to read their own record
CREATE POLICY "Allow coordinators to read own record"
ON coordinators
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
