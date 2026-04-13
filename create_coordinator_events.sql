-- 1. Create join table for multiple event assignments
CREATE TABLE IF NOT EXISTS public.coordinator_events (
    coordinator_id UUID REFERENCES public.coordinators(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    PRIMARY KEY (coordinator_id, event_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.coordinator_events ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS Policies (Align with existing admin-only access)
DROP POLICY IF EXISTS "Admins can manage all coordinator events" ON public.coordinator_events;
CREATE POLICY "Admins can manage all coordinator events" ON public.coordinator_events
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Migrate existing single event assignments to the join table
INSERT INTO public.coordinator_events (coordinator_id, event_id)
SELECT id, event_id FROM public.coordinators
WHERE event_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. (Informative) Note: We keep coordinators.event_id for now to avoid breaking existing queries 
-- until the code is fully updated.
