-- Migration: add trigger to update user submission stats
-- This trigger updates submission_count and last_submission automatically
-- whenever a new row is inserted into public.submissions.

-- 1. Create (or replace) the function
CREATE OR REPLACE FUNCTION public.update_user_submission_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET 
    submission_count = submission_count + 1,
    last_submission = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if it exists (safety)
DROP TRIGGER IF EXISTS submissions_after_insert ON public.submissions;

-- 3. Create new trigger
CREATE TRIGGER submissions_after_insert
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_submission_stats();
