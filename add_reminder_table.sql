-- Create the whatsapp_scheduled_messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('reminder_7_days', 'reminder_72_hours')),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by status and message type
CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_messages_status ON public.whatsapp_scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_messages_event_guest ON public.whatsapp_scheduled_messages(event_id, guest_id, message_type);
