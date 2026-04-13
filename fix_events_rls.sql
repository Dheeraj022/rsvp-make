-- Fix RLS policies to allow coordinators to see their assigned events
-- This solves the issue where coordinators could only see the primary event name but not additional assigned ones.

-- 1. Ensure coordinator_events table is accessible to the current user
DROP POLICY IF EXISTS "Coordinators can view their own event assignments" ON coordinator_events;
CREATE POLICY "Coordinators can view their own event assignments" ON coordinator_events
    FOR SELECT
    TO public
    USING (
        coordinator_id IN (
            SELECT id FROM coordinators WHERE user_id = auth.uid()
        )
        OR 
        EXISTS (
            -- Allow admins to see all
            SELECT 1 FROM coordinators WHERE user_id = auth.uid() AND email LIKE '%admin%'
        )
    );

-- 2. Grant SELECT access on events table to coordinators for their assigned events
-- This policy allows a user to see an event if they are linked to it in coordinator_events
DROP POLICY IF EXISTS "Coordinators can view assigned events" ON events;
CREATE POLICY "Coordinators can view assigned events" ON events
    FOR SELECT
    TO public
    USING (
        id IN (
            SELECT event_id FROM coordinator_events 
            WHERE coordinator_id IN (SELECT id FROM coordinators WHERE user_id = auth.uid())
        )
        OR 
        id IN (
            SELECT event_id FROM coordinators WHERE user_id = auth.uid()
        )
    );

-- 3. Also ensure guests are visible for all assigned events
DROP POLICY IF EXISTS "Coordinators can view guests of assigned events" ON guests;
CREATE POLICY "Coordinators can view guests of assigned events" ON guests
    FOR SELECT
    TO public
    USING (
        event_id IN (
            SELECT event_id FROM coordinator_events 
            WHERE coordinator_id IN (SELECT id FROM coordinators WHERE user_id = auth.uid())
        )
        OR 
        event_id IN (
            SELECT event_id FROM coordinators WHERE user_id = auth.uid()
        )
    );
