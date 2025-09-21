-- Migration: backfill points for existing users
-- +10 per submission

UPDATE public.users u
SET points = sub.total_points
FROM (
  SELECT user_id, COUNT(*) * 10 AS total_points
  FROM public.submissions
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;
