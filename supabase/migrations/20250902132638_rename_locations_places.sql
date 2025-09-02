-- This migration script renames the 'locations' table to 'places'
-- and updates all associated indexes, constraints, and foreign key references.

-- Step 1: Drop the foreign key constraint in the 'submissions' table
-- that references the old 'locations' table.
ALTER TABLE public.submissions DROP CONSTRAINT submissions_location_id_fkey;

-- Step 2: Rename the 'locations' table to 'places'.
ALTER TABLE public.locations RENAME TO places;

-- Step 3: Rename the primary key and all associated indexes to match the new table name.
ALTER TABLE public.places RENAME CONSTRAINT locations_pkey TO places_pkey;
ALTER INDEX public.idx_locations_store_id RENAME TO idx_places_store_id;
ALTER INDEX public.idx_locations_address RENAME TO idx_places_address;
ALTER INDEX public.idx_unique_store_address RENAME TO idx_places_unique_store_address;

-- Step 4: Add a new foreign key constraint to the 'submissions' table,
-- referencing the newly renamed 'places' table.
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_location_id_fkey
FOREIGN KEY (location_id)
REFERENCES public.places(id)
ON DELETE NO ACTION;

-- Step 5: Rename the index on the submissions table to match the new foreign key.
ALTER INDEX public.submissions_location_id_idx RENAME TO submissions_places_id_idx;
