-- Add is_active column to coordinators table
ALTER TABLE public.coordinators 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
