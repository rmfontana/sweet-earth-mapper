-- Add new columns
ALTER TABLE public.submissions
  ADD COLUMN purchase_date date NULL;

ALTER TABLE public.submissions
  ADD COLUMN harvest_time text NULL;

ALTER TABLE public.submissions
  ADD COLUMN farm_location text NULL;

ALTER TABLE public.submissions
  ADD COLUMN contributor_name text NULL;

ALTER TABLE public.submissions
  ADD COLUMN outlier_notes text NULL;

-- Rename columns
ALTER TABLE public.submissions
  RENAME COLUMN label TO crop_variety;

ALTER TABLE public.submissions
  RENAME COLUMN timestamp TO assessment_date;
