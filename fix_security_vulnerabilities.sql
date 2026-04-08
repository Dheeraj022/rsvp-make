-- 1. Create a secure function to check for admin status
-- This uses SECURITY DEFINER to run with bypassRLS if needed, but we check against our public.users table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix whatsapp_scheduled_messages RLS
ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all scheduled messages" ON public.whatsapp_scheduled_messages;
CREATE POLICY "Admins can manage all scheduled messages" ON public.whatsapp_scheduled_messages
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role can manage all scheduled messages" ON public.whatsapp_scheduled_messages;
CREATE POLICY "Service role can manage all scheduled messages" ON public.whatsapp_scheduled_messages
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Update existing tables to use the secure is_admin check instead of user_metadata
-- events Table
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
CREATE POLICY "Admins can manage all events" ON public.events
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- hotels Table
DROP POLICY IF EXISTS "Admins can manage all hotels" ON public.hotels;
CREATE POLICY "Admins can manage all hotels" ON public.hotels
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- coordinators Table
DROP POLICY IF EXISTS "Admins can manage all coordinators" ON public.coordinators;
CREATE POLICY "Admins can manage all coordinators" ON public.coordinators
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- users Table
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Restrict what users can update for themselves (to prevent role escalation)
-- We remove the existing policy and add one that only allows updating full_name
DROP POLICY IF EXISTS "Users can update their own metadata" ON public.users;
CREATE POLICY "Users can update their own metadata" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        role = (SELECT role FROM public.users WHERE id = auth.uid()) AND
        email = (SELECT email FROM public.users WHERE id = auth.uid())
    );
