-- Add is_active column to hotels table
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE public.hotels SET is_active = true WHERE is_active IS NULL;
