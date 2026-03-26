-- Shared Admin Access for RSVP Event Management

-- 1. Events Table
-- Allow all admins to manage (SELECT, INSERT, UPDATE, DELETE) all events
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
CREATE POLICY "Admins can manage all events" ON public.events
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 2. Hotels Table
-- Allow all admins to manage (SELECT, INSERT, UPDATE, DELETE) all hotels
DROP POLICY IF EXISTS "Admins can view all hotels" ON public.hotels;
DROP POLICY IF EXISTS "Admins can manage all hotels" ON public.hotels;
CREATE POLICY "Admins can manage all hotels" ON public.hotels
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 3. Coordinators Table
-- Allow all admins to manage (SELECT, INSERT, UPDATE, DELETE) all coordinators
DROP POLICY IF EXISTS "Admins can view all coordinators" ON public.coordinators;
DROP POLICY IF EXISTS "Admins can manage all coordinators" ON public.coordinators;
CREATE POLICY "Admins can manage all coordinators" ON public.coordinators
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
