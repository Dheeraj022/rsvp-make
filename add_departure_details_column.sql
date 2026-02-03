-- Add departure_details column to guests table
-- This column will store departure information as JSONB

ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS departure_details JSONB;

-- Add a comment to describe the column
COMMENT ON COLUMN guests.departure_details IS 'Stores departure information including date, time, travelers with their mode of travel and ticket URLs, and optional message';
