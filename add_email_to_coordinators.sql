-- Add email and event_id columns to coordinators table
ALTER TABLE public.coordinators 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id);

-- 1. Coordinator Profile Access
-- Allow coordinators to view their own profile information
DROP POLICY IF EXISTS "Coordinators can view their own profile" ON public.coordinators;
CREATE POLICY "Coordinators can view their own profile" ON public.coordinators
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

-- 2. Guest Management Permissions
-- Allow coordinators to view guests:
-- a) Assigned to them directly via coordinator_id
-- b) Belonging to the event they are assigned to
DROP POLICY IF EXISTS "Coordinators can view assigned guests" ON public.guests;
CREATE POLICY "Coordinators can view assigned guests" ON public.guests
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.coordinators 
            WHERE user_id = auth.uid() 
            AND (id = guests.coordinator_id OR event_id = guests.event_id)
        )
    );

-- Allow coordinators to update check-in status of these guests
DROP POLICY IF EXISTS "Coordinators can check-in assigned guests" ON public.guests;
CREATE POLICY "Coordinators can check-in assigned guests" ON public.guests
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.coordinators 
            WHERE user_id = auth.uid() 
            AND (id = guests.coordinator_id OR event_id = guests.event_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coordinators 
            WHERE user_id = auth.uid() 
            AND (id = guests.coordinator_id OR event_id = guests.event_id)
        )
    );
