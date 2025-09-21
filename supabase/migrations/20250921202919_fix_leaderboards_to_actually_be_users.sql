-- =====================================================================
-- Migration: Fixed Leaderboards to Match Mockup Design
-- =====================================================================

-- Drop old functions first
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_submission_count_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_user_leaderboard(text, text, text, text);

-- =====================
-- BRAND LEADERBOARD - Aggregate by brand across all locations
-- =====================
CREATE FUNCTION get_brand_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
RETURNS TABLE (
  brand_id uuid,
  brand_name text,
  brand_label text,
  average_normalized_score numeric,
  average_brix numeric,
  submission_count bigint,
  grade text,
  rank integer
)
LANGUAGE sql
AS $$
  WITH base AS (
    SELECT
      b.id as brand_id,
      b.name as brand_name,
      COALESCE(b.label, b.name) as brand_label,
      AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as average_normalized_score,
      AVG(s.brix_value) as average_brix,
      COUNT(*) as submission_count
    FROM submissions s
    JOIN brands b on s.brand_id = b.id
    JOIN places p on s.place_id = p.id
    LEFT JOIN crops c on s.crop_id = c.id
    WHERE
      (country_filter is null or lower(p.country) = lower(country_filter))
      AND (state_filter is null or lower(p.state) = lower(state_filter))
      AND (city_filter is null or lower(p.city) = lower(city_filter))
      AND (crop_filter is null or lower(c.name) = lower(crop_filter))
    GROUP BY b.id, b.name, b.label
  )
  SELECT *,
    CASE
      WHEN average_normalized_score >= 1.75 THEN 'Excellent'
      WHEN average_normalized_score >= 1.5 THEN 'Good'
      WHEN average_normalized_score >= 1.25 THEN 'Poor'
      ELSE 'Needs Improvement'
    END as grade,
    RANK() OVER (ORDER BY average_normalized_score DESC) as rank
  FROM base;
$$;

-- =====================
-- LOCATION LEADERBOARD - Aggregate by location chain, show best performing locations
-- =====================
CREATE FUNCTION get_location_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
RETURNS TABLE (
  location_id uuid,
  location_name text,
  location_label text,
  city text,
  state text,
  country text,
  average_normalized_score numeric,
  average_brix numeric,
  submission_count bigint,
  grade text,
  rank integer
)
LANGUAGE sql
AS $$
  WITH base AS (
    SELECT
      l.id as location_id,
      l.name as location_name,
      COALESCE(l.label, l.name) as location_label,
      p.city,
      p.state,
      p.country,
      AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) as average_normalized_score,
      AVG(s.brix_value) as average_brix,
      COUNT(*) as submission_count
    FROM submissions s
    JOIN places p on s.place_id = p.id
    JOIN locations l on p.location_id = l.id
    LEFT JOIN crops c on s.crop_id = c.id
    WHERE
      l.id IS NOT NULL
      AND (country_filter is null or lower(p.country) = lower(country_filter))
      AND (state_filter is null or lower(p.state) = lower(state_filter))
      AND (city_filter is null or lower(p.city) = lower(city_filter))
      AND (crop_filter is null or lower(c.name) = lower(crop_filter))
    GROUP BY l.id, l.name, l.label, p.city, p.state, p.country
  )
  SELECT *,
    CASE
      WHEN average_normalized_score >= 1.75 THEN 'Excellent'
      WHEN average_normalized_score >= 1.5 THEN 'Good'
      WHEN average_normalized_score >= 1.25 THEN 'Poor'
      ELSE 'Needs Improvement'
    END as grade,
    RANK() OVER (ORDER BY average_normalized_score DESC) as rank
  FROM base;
$$;

-- =====================
-- USER LEADERBOARD - Most active users by submission count
-- =====================
CREATE FUNCTION get_user_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  submission_count bigint,
  rank integer
)
LANGUAGE sql
AS $$
  WITH user_submissions AS (
    SELECT
      u.id as user_id,
      COALESCE(u.display_name, u.email, 'Anonymous User') as user_name,
      COUNT(s.id) as submission_count
    FROM users u
    JOIN submissions s on u.id = s.user_id
    JOIN places p on s.place_id = p.id
    LEFT JOIN crops c on s.crop_id = c.id
    WHERE
      (country_filter is null or lower(p.country) = lower(country_filter))
      AND (state_filter is null or lower(p.state) = lower(state_filter))
      AND (city_filter is null or lower(p.city) = lower(city_filter))
      AND (crop_filter is null or lower(c.name) = lower(crop_filter))
    GROUP BY u.id, u.display_name, u.email
    HAVING COUNT(s.id) > 0
  )
  SELECT *,
    RANK() OVER (ORDER BY submission_count DESC) as rank
  FROM user_submissions;
$$;
