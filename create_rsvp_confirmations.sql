-- Create rsvp_confirmations table
CREATE TABLE IF NOT EXISTS rsvp_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'not_attending')),
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_confirmations_event_id ON rsvp_confirmations(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_confirmations_guest_id ON rsvp_confirmations(guest_id);

-- Enable RLS
ALTER TABLE rsvp_confirmations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read confirmations (admins)
CREATE POLICY "Allow authenticated to select rsvp_confirmations" 
ON rsvp_confirmations FOR SELECT 
TO authenticated 
USING (true);

-- Allow public insertion for the confirmation system
-- This is necessary for guests confirm attendance without logging in
CREATE POLICY "Allow public insert rsvp_confirmations" 
ON rsvp_confirmations FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service_role full access to rsvp" 
ON rsvp_confirmations FOR ALL 
TO service_role 
USING (true);
