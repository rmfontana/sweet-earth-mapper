-- Targeted Migration: Only modify stores table and add store_id to locations
-- Preserves all existing tables except stores

BEGIN;

-- Step 1: Drop foreign key constraints that reference the stores table
ALTER TABLE public.submissions 
DROP CONSTRAINT IF EXISTS submissions_store_id_fkey;

-- Step 2: Drop the stores table (it has the wrong structure with location_id)
DROP TABLE IF EXISTS public.stores CASCADE;

-- Step 3: Create the new stores table with correct structure
CREATE TABLE public.stores (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    label text NULL,
    type text NULL,
    CONSTRAINT stores_pkey PRIMARY KEY (id),
    CONSTRAINT stores_name_key UNIQUE (name),
    -- Enforce the valid store types using a CHECK constraint.
    CONSTRAINT stores_type_check CHECK (
        type IN (
            'Grocery',
            'Health', 
            'Community',
            'Specialty',
            'Club',
            'Farmers',
            'Other'
        )
    )
) TABLESPACE pg_default;

-- Step 4: Add store_id column to locations table (if it doesn't exist)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS store_id uuid NULL;

-- Step 5: Add foreign key constraint from locations to stores
ALTER TABLE public.locations
ADD CONSTRAINT locations_store_id_fkey 
FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

-- Step 6: Re-add foreign key constraint from submissions to stores
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_store_id_fkey 
FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

-- Step 7: Create index on locations store_id for performance
CREATE INDEX IF NOT EXISTS idx_locations_store_id 
ON public.locations USING btree (store_id) TABLESPACE pg_default;

-- Step 8: Add comments for clarity
COMMENT ON COLUMN public.stores.name IS 'A unique, machine-friendly name (slug) for the store type.';
COMMENT ON COLUMN public.stores.label IS 'The human-readable name of the store type.';
COMMENT ON COLUMN public.stores.type IS 'The category of the store.';

COMMIT;

-- Schema is now ready for data import using the Python migration script
-- All existing brands, crops, locations, and submissions tables are preserved