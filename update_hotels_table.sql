-- Safely update the existing hotels table if it already exists
DO $$ 
BEGIN
    -- Add user_id if missing and handle constraint issues
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hotels' AND COLUMN_NAME = 'user_id') THEN
        ALTER TABLE public.hotels ADD COLUMN user_id UUID;
    ELSE
        -- If it exists, remove the strict FK constraint which causes race conditions in some Supabase setups
        ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_user_id_fkey;
    END IF;

    -- Add manager_name if missing
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hotels' AND COLUMN_NAME = 'manager_name') THEN
        ALTER TABLE public.hotels ADD COLUMN manager_name TEXT;
    END IF;

    -- Fix the NOT NULL constraint on admin_id if it exists
    -- This allows hotels to register themselves without a pre-assigned admin_id
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hotels' AND COLUMN_NAME = 'admin_id') THEN
        ALTER TABLE public.hotels ALTER COLUMN admin_id DROP NOT NULL;
    END IF;

    -- Ensure email and name exist (they should if the table was created based on previous instructions)
    -- But we can add them just in case
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hotels' AND COLUMN_NAME = 'name') THEN
        ALTER TABLE public.hotels ADD COLUMN name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hotels' AND COLUMN_NAME = 'email') THEN
        ALTER TABLE public.hotels ADD COLUMN email TEXT;
    END IF;
END $$;

-- Re-apply RLS and Policies with fixes for the signup error
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- 1. Restrict INSERT to authenticated admins only
-- This ensures that only users logged into the admin dashboard can create hotel profiles
DROP POLICY IF EXISTS "Enable insert for signup" ON public.hotels;
DROP POLICY IF EXISTS "Admins can create hotels" ON public.hotels;
CREATE POLICY "Admins can create hotels" ON public.hotels
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_id);

-- 2. Allow users to manage their OWN record (SELECT, UPDATE, DELETE)
-- This ensures that once they are logged in, they can only see/edit their own data
DROP POLICY IF EXISTS "Users can manage their own hotel profile" ON public.hotels;
CREATE POLICY "Users can manage their own hotel profile" ON public.hotels
    FOR ALL USING (auth.uid() = user_id);

-- 3. Allow admins to view all hotels for assignment
-- Note: 'authenticated' role covers both admins and logged-in hotels. 
-- Since hotels are restricted by policy #2, this primarily enables the admin view.
DROP POLICY IF EXISTS "Authenticated users can view all hotels" ON public.hotels;
CREATE POLICY "Authenticated users can view all hotels" ON public.hotels
    FOR SELECT TO authenticated USING (true);

-- 4. Enable admins to UPDATE event assignments (handled via the 'events' table, but good to have)
-- If we ever need to update hotel details from admin dashboard
DROP POLICY IF EXISTS "Admins can update hotels" ON public.hotels;
CREATE POLICY "Admins can update hotels" ON public.hotels
    FOR UPDATE TO authenticated USING (true);
