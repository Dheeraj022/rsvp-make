-- Create whatsapp_logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'Invite', 'Reminder', 'Arrival', 'Departure', 'RSVP Confirm'
    status TEXT NOT NULL, -- 'Sent', 'Failed'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_event_id ON whatsapp_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_guest_id ON whatsapp_logs(guest_id);

-- Enable RLS
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read logs (admins)
CREATE POLICY "Allow authenticated to select whatsapp_logs" 
ON whatsapp_logs FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role to insert logs
CREATE POLICY "Allow service_role full access" 
ON whatsapp_logs FOR ALL 
TO service_role 
USING (true);
