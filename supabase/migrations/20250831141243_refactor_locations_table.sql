-- This migration updates the `locations` table to support our geocoding workflow.
-- It adds address columns, renames the 'name' column to 'label', and removes unnecessary ones.

-- Add the address columns required for geocoding and data linkage
ALTER TABLE public.locations
ADD COLUMN street_address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT;

-- Rename the 'name' column to 'label'
ALTER TABLE public.locations
RENAME COLUMN name TO label;

-- Drop the columns that are no longer needed
ALTER TABLE public.locations
DROP COLUMN place_id,
DROP COLUMN geom;

-- Add an index on the address columns for faster lookups
CREATE INDEX idx_locations_address ON public.locations(street_address, city, state);
