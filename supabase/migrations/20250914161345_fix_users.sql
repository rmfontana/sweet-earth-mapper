-- SAFE MIGRATION FOR REGISTRATION SYSTEM (WITHOUT updated_at)
-- Run this in your Supabase SQL editor

-- Step 1: Drop existing trigger and function only if they exist (safe drop)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Ensure users table exists and has correct structure (create if not exists, add missing columns)
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    display_name text,
    role text DEFAULT 'user'::text,
    points integer DEFAULT 0,
    submission_count integer DEFAULT 0,
    last_submission timestamp with time zone,
    country text,
    state text,
    city text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    -- updated_at column removed here
);

-- Add missing columns if they don't exist (except updated_at)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'display_name' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN display_name text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role text DEFAULT 'user'::text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'points' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN points integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'submission_count' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN submission_count integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_submission' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_submission timestamp with time zone;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'country' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN country text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'state' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN state text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'city' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN city text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'created_at' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;

    -- Do NOT add updated_at column
END
$$;

-- Step 3: Create indexes only if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'users_country_idx'
    ) THEN
        CREATE INDEX users_country_idx ON public.users (country);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'users_state_idx'
    ) THEN
        CREATE INDEX users_state_idx ON public.users (state);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'users_city_idx'
    ) THEN
        CREATE INDEX users_city_idx ON public.users (city);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'users_role_idx'
    ) THEN
        CREATE INDEX users_role_idx ON public.users (role);
    END IF;
END
$$;

-- Step 4: Enable RLS if not enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies safely (drop existing with same names to avoid duplicates)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
CREATE POLICY "Enable insert for authenticated users only" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 6: Create the trigger function for new user insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1)
        ),
        'user',
        0,
        0,
        NEW.raw_user_meta_data->>'country',
        NEW.raw_user_meta_data->>'state',
        NEW.raw_user_meta_data->>'city'
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 7: Create the trigger for auth.users insert event
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();