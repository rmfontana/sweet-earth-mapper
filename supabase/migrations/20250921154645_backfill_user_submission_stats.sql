-- Migration: backfill user submission_count and last_submission
-- This ensures existing users get accurate stats based on the submissions table.

-- Update submission_count for all users
UPDATE public.users u
SET submission_count = sub.count
FROM (
  SELECT user_id, COUNT(*)::integer AS count
  FROM public.submissions
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;

-- Update last_submission for all users
UPDATE public.users u
SET last_submission = sub.last_date
FROM (
  SELECT user_id, MAX(assessment_date) AS last_date
  FROM public.submissions
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;
