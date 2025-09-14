-- Cleanup migration: Remove any partial/broken location setup
-- Run this first to ensure clean state

-- Drop indexes if they exist
DROP INDEX IF EXISTS public.users_country_idx;
DROP INDEX IF EXISTS public.users_state_idx;
DROP INDEX IF EXISTS public.users_city_idx;
DROP INDEX IF EXISTS public.users_location_composite_idx;

-- Drop columns if they exist (this will clean up any broken state)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS country,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS city;

-- Add location columns to users table
ALTER TABLE public.users 
ADD COLUMN country text,
ADD COLUMN state text,
ADD COLUMN city text;

-- Create indexes for location columns
CREATE INDEX users_country_idx ON public.users (country);
CREATE INDEX users_state_idx ON public.users (state);
CREATE INDEX users_city_idx ON public.users (city);

-- Update the trigger function to handle location data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    display_name,
    role,
    points,
    submission_count,
    country,
    state,
    city
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'user',
    0,
    0,
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'city'
  );
  RETURN NEW;
END;
$function$;

