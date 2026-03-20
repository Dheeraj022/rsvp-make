-- Add parent_id column to guests table to support companion linking
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES guests(id) ON DELETE SET NULL;

-- Create an index to improve search performance for companions
CREATE INDEX IF NOT EXISTS idx_guests_parent_id ON guests(parent_id);

-- Optional: If you haven't added coordinator_id yet, uncomment the lines below
-- ALTER TABLE guests 
-- ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES coordinators(id) ON DELETE SET NULL;
-- CREATE INDEX IF NOT EXISTS idx_guests_coordinator_id ON guests(coordinator_id);
