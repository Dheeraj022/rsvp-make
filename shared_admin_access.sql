-- Shared Admin Access for RSVP Event Management

-- 1. Events Table
-- Allow all admins to view all events
DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events" ON events
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 2. Hotels Table
-- Allow all admins to view all hotels
DROP POLICY IF EXISTS "Admins can view all hotels" ON hotels;
CREATE POLICY "Admins can view all hotels" ON hotels
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 3. Coordinators Table
-- Allow all admins to view all coordinators
DROP POLICY IF EXISTS "Admins can view all coordinators" ON coordinators;
CREATE POLICY "Admins can view all coordinators" ON coordinators
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 4. Enable coordinators to see events they are assigned to (if not already handled)
-- This ensures that when we remove filtering in the frontend, coordinators STILL only see their own data
-- because RLS will filter it for them.
DROP POLICY IF EXISTS "Coordinators can view assigned events" ON events;
CREATE POLICY "Coordinators can view assigned events" ON events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coordinators 
    WHERE coordinators.user_id = auth.uid() 
    AND (coordinators.event_id = events.id OR events.admin_id = coordinators.admin_id)
  )
);
