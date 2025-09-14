-- This migration ensures that all existing users have the new location columns
-- set to a default value (in this case, NULL), so the database schema remains valid.

-- This is idempotent; running it multiple times will not cause issues.
-- The alter table statements in the previous migration automatically handle new users.

UPDATE public.users
SET
country = NULL,
state = NULL,
city = NULL
WHERE
country IS NULL AND state IS NULL AND city IS NULL;