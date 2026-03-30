-- SQL script to add WhatsApp toggle to events table
-- Run this in your Supabase SQL Editor

ALTER TABLE events 
ADD COLUMN is_whatsapp_enabled BOOLEAN DEFAULT TRUE;

-- Update existing events to have it enabled by default
UPDATE events SET is_whatsapp_enabled = TRUE WHERE is_whatsapp_enabled IS NULL;
