-- Create hotels table
CREATE TABLE IF NOT EXISTS public.hotels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users, -- Optional: Link to their auth account if self-registered
    name TEXT NOT NULL,
    manager_name TEXT,
    email TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- Create policy so hotels can see/edit their own profile
DROP POLICY IF EXISTS "Users can manage their own hotel profile" ON public.hotels;
CREATE POLICY "Users can manage their own hotel profile" ON public.hotels
    FOR ALL USING (auth.uid() = user_id);

-- Create policy so admins can see all hotels
-- Note: You might need to adjust this depending on how you identify Admins
-- For now, allowing all authenticated users to read (assuming admin is authenticated)
DROP POLICY IF EXISTS "Authenticated users can view all hotels" ON public.hotels;
CREATE POLICY "Authenticated users can view all hotels" ON public.hotels
    FOR SELECT TO authenticated USING (true);

-- Optional: Create an index for faster lookups by admin_id
CREATE INDEX IF NOT EXISTS idx_hotels_admin_id ON public.hotels(admin_id);
