-- Add location columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS city text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_country_idx ON public.users (country);
CREATE INDEX IF NOT EXISTS users_state_idx ON public.users (state);
CREATE INDEX IF NOT EXISTS users_city_idx ON public.users (city);

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