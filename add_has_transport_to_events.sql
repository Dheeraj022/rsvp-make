-- Add has_transport column to events table
ALTER TABLE events ADD COLUMN has_transport BOOLEAN DEFAULT TRUE;

-- Update existing events to have transport enabled by default
UPDATE events SET has_transport = TRUE WHERE has_transport IS NULL;
