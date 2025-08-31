-- Drop old indexes
DROP INDEX IF EXISTS public.crops_name_normalized_unique;
DROP INDEX IF EXISTS public.crops_name_idx;

-- Drop the old column
ALTER TABLE public.crops DROP COLUMN name_normalized;

-- Add the new column
ALTER TABLE public.crops ADD COLUMN label text;