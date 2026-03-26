-- Add creator name and email to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by_email TEXT;
