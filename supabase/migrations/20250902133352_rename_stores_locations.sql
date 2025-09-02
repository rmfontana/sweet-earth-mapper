-- This script handles all subsequent schema changes:
-- 1. Renames the 'stores' table to 'locations'.
-- 2. Renames the 'store_id' column to 'location_id' in the 'places' table.
-- 3. Renames the 'store_id' column to 'location_id' in the 'submissions' table.
-- 4. Renames the 'location_id' column to 'place_id' in the 'submissions' table.
-- All associated foreign key constraints and indexes are updated accordingly.

-- Step 1: Drop foreign key constraints that will be affected by table and column renames.
-- Drop the constraint on the 'places' table that references 'stores'.
ALTER TABLE public.places DROP CONSTRAINT locations_store_id_fkey;

-- Drop the constraint on the 'submissions' table that references 'stores'.
ALTER TABLE public.submissions DROP CONSTRAINT submissions_store_id_fkey;

-- Step 2: Rename the 'stores' table to 'locations'.
ALTER TABLE public.stores RENAME TO locations;

-- Step 3: Rename columns in the 'places' and 'submissions' tables.
-- Rename the existing 'submissions.location_id' to 'place_id' first to avoid conflicts.
ALTER TABLE public.submissions RENAME COLUMN location_id TO place_id;
-- Now, rename the other columns.
ALTER TABLE public.places RENAME COLUMN store_id TO location_id;
ALTER TABLE public.submissions RENAME COLUMN store_id TO location_id;

-- Step 4: Rename indexes and constraints to match the new names.
ALTER TABLE public.submissions RENAME CONSTRAINT submissions_location_id_fkey TO submissions_place_id_fkey;
ALTER TABLE public.locations RENAME CONSTRAINT stores_pkey TO locations_pkey;
ALTER INDEX public.idx_places_store_id RENAME TO idx_places_location_id;
ALTER INDEX public.idx_places_unique_store_address RENAME TO idx_places_unique_location_address;
ALTER INDEX public.submissions_places_id_idx RENAME TO submissions_place_id_idx;

-- Step 5: Re-add the foreign key constraints to the new tables and columns.
-- Add back the foreign key on 'places' referencing the new 'locations' table.
ALTER TABLE public.places
ADD CONSTRAINT places_location_id_fkey
FOREIGN KEY (location_id)
REFERENCES public.locations(id)
ON DELETE SET NULL;

-- Add back the foreign key on 'submissions' referencing the new 'locations' table.
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_location_id_fkey
FOREIGN KEY (location_id)
REFERENCES public.locations(id)
ON DELETE SET NULL;
