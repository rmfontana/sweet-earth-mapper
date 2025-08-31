-- Drop old unique constraints and indexes
ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_machine_name_key;
DROP INDEX IF EXISTS public.brands_name_normalized_unique;
DROP INDEX IF EXISTS public.brands_name_idx;

-- Drop the old columns
ALTER TABLE public.brands DROP COLUMN name_normalized;
ALTER TABLE public.brands DROP COLUMN machine_name;

-- Add the new column
ALTER TABLE public.brands ADD COLUMN label text;