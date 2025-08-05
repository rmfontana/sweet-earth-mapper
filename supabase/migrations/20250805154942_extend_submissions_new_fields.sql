ALTER TABLE public.submissions
  ADD COLUMN purchase_date timestamptz NULL,
  ADD COLUMN farm_location text NULL,
  ADD COLUMN contributor_name text NULL,
  ADD COLUMN harvest_time text NULL,
  ADD COLUMN notes text NULL;

ALTER TABLE public.submissions
  RENAME COLUMN timestamp TO assessment_date;

ALTER TABLE public.submissions
  ADD COLUMN purchase_date date NULL,
  RENAME COLUMN label TO crop_variety,
  ADD COLUMN harvest_time text NULL,
  ADD COLUMN farm_location text NULL,
  ADD COLUMN contributor_name text NULL,
  ADD COLUMN outlier_notes text NULL;