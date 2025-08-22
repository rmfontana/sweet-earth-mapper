-- Migration: Modify name_normalized generation logic

-- Step 1: Drop indexes that depend on name_normalized
-- This is necessary before dropping the generated column itself.
DROP INDEX IF EXISTS public.crops_name_normalized_unique;
DROP INDEX IF EXISTS public.crops_name_idx;

-- Step 2: Drop the existing generated column
ALTER TABLE public.crops DROP COLUMN name_normalized;

-- Step 3: Add the new generated column with the desired logic
-- This will automatically populate values based on the 'name' column.
ALTER TABLE public.crops ADD COLUMN name_normalized text GENERATED ALWAYS AS (lower(replace(name, ' ', '_'))) STORED;

-- Step 4: Recreate the unique index on the new generated column
CREATE UNIQUE INDEX IF NOT EXISTS crops_name_normalized_unique ON public.crops USING btree (name_normalized) TABLESPACE pg_default;

-- Step 5: Recreate the non-unique index on the new generated column
CREATE INDEX IF NOT EXISTS crops_name_idx ON public.crops USING btree (name_normalized) TABLESPACE pg_default;
