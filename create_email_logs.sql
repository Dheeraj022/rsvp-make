-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'Invite', 'Reminder', 'Service Alert'
    status TEXT NOT NULL, -- 'Sent', 'Failed'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_event_id ON email_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_guest_id ON email_logs(guest_id);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read logs (admins)
CREATE POLICY "Allow authenticated to select email_logs" 
ON email_logs FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role to insert logs
CREATE POLICY "Allow service_role full access" 
ON email_logs FOR ALL 
TO service_role 
USING (true);
