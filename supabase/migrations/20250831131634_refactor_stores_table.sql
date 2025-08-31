-- Drop old unique constraints and indexes
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_machine_name_key;
DROP INDEX IF EXISTS public.stores_name_normalized_unique;
DROP INDEX IF EXISTS public.stores_name_idx;

-- Drop the old columns
ALTER TABLE public.stores DROP COLUMN name_normalized;
ALTER TABLE public.stores DROP COLUMN machine_name;

-- Add the new column
ALTER TABLE public.stores ADD COLUMN label text;