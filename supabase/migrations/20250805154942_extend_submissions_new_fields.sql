ALTER TABLE public.submissions
  ADD COLUMN purchase_date timestamptz NULL,
  ADD COLUMN farm_location text NULL,
  ADD COLUMN contributor_name text NULL,
  ADD COLUMN harvest_time text NULL,
  ADD COLUMN notes text NULL;