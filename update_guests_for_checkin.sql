-- Add check-in and assignment fields to guests table
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS check_in_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS seat_number TEXT,
ADD COLUMN IF NOT EXISTS assignment_label TEXT,
ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES public.coordinators(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_guests_coordinator ON public.guests(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_guests_assignment ON public.guests(assignment_label);
