-- Create coordinators table
CREATE TABLE IF NOT EXISTS public.coordinators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    user_id UUID, -- Links to auth.users
    admin_id UUID NOT NULL -- Links to the admin who created them
);

-- Enable RLS
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage their coordinators" ON public.coordinators;
CREATE POLICY "Admins can manage their coordinators" ON public.coordinators
    FOR ALL TO authenticated USING (auth.uid() = admin_id);

-- Explicitly allow insert for admins (mostly covered by ALL, but good for clarity)
DROP POLICY IF EXISTS "Admins can create coordinators" ON public.coordinators;
CREATE POLICY "Admins can create coordinators" ON public.coordinators
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_id);
