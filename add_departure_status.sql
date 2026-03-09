-- Update guests table to add departure_status
-- This will allow tracking which guests have departed

ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS departure_status TEXT DEFAULT 'pending';

-- Add a comment for clarity
COMMENT ON COLUMN guests.departure_status IS 'Tracks guest departure status (e.g., pending, departed)';
