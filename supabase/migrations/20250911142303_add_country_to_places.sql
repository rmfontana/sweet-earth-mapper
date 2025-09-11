BEGIN;

-- Add a new column 'country' to the 'places' table.
-- The IF NOT EXISTS clause ensures this command won't fail if the column already exists,
-- making the script idempotent and safe to run multiple times.
ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS country text;

-- Check if the column was added and is empty for existing rows.
-- This UPDATE statement is safe because it only affects rows where 'country' is currently NULL.
UPDATE public.places
SET country = 'United States'
WHERE country IS NULL;

-- If you have a significant number of rows, you might consider adding an index for the new column
-- to optimize filtering performance in your queries.
CREATE INDEX IF NOT EXISTS idx_places_country ON public.places (country);

COMMIT;