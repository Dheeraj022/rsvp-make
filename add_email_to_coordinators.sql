-- Add email column to coordinators table
ALTER TABLE public.coordinators 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 1. Coordinator Profile Access
-- Allow coordinators to view their own profile information
DROP POLICY IF EXISTS "Coordinators can view their own profile" ON public.coordinators;
CREATE POLICY "Coordinators can view their own profile" ON public.coordinators
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

-- 2. Guest Management Permissions
-- Allow coordinators to view guests assigned to them
DROP POLICY IF EXISTS "Coordinators can view assigned guests" ON public.guests;
CREATE POLICY "Coordinators can view assigned guests" ON public.guests
    FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.coordinators 
        WHERE user_id = auth.uid() AND id = guests.coordinator_id
    ));

-- Allow coordinators to update check-in status of assigned guests
DROP POLICY IF EXISTS "Coordinators can check-in assigned guests" ON public.guests;
CREATE POLICY "Coordinators can check-in assigned guests" ON public.guests
    FOR UPDATE TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.coordinators 
        WHERE user_id = auth.uid() AND id = guests.coordinator_id
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.coordinators 
        WHERE user_id = auth.uid() AND id = guests.coordinator_id
    ));

-- Update existing coordinators with dummy emails if needed (optional)
-- UPDATE public.coordinators SET email = username || '@rsvp.com' WHERE email IS NULL;
