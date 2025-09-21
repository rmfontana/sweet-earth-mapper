-- =====================================================================
-- Migration: Safe Recreate Leaderboards (Brands, Crops, Locations, Submissions, Users)
-- =====================================================================

-- Drop old functions first (safe)
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_submission_count_leaderboard(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_user_leaderboard(text, text, text, text);

-- =====================
-- BRAND LEADERBOARD - Aggregate by brand across all locations
-- =====================
CREATE FUNCTION public.get_brand_leaderboard(
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
      b.id AS brand_id,
      b.name AS brand_name,
      COALESCE(b.label, b.name) AS brand_label,
      AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score,
      AVG(s.brix_value) AS average_brix,
      COUNT(*) AS submission_count
    FROM submissions s
    JOIN brands b ON s.brand_id = b.id
    JOIN places p ON s.place_id = p.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE
      (country_filter IS NULL OR lower(p.country) = lower(country_filter))
      AND (state_filter IS NULL OR lower(p.state) = lower(state_filter))
      AND (city_filter IS NULL OR lower(p.city) = lower(city_filter))
      AND (crop_filter IS NULL OR lower(c.name) = lower(crop_filter))
    GROUP BY b.id, b.name, b.label
  )
  SELECT
    brand_id,
    brand_name,
    brand_label,
    average_normalized_score,
    average_brix,
    submission_count,
    CASE
      WHEN average_normalized_score >= 1.75 THEN 'Excellent'
      WHEN average_normalized_score >= 1.5 THEN 'Good'
      WHEN average_normalized_score >= 1.25 THEN 'Poor'
      ELSE 'Needs Improvement'
    END AS grade,
    RANK() OVER (ORDER BY average_normalized_score DESC) AS rank
  FROM base;
$$;

-- =====================
-- CROP LEADERBOARD - Aggregate by crop across locations
-- =====================
CREATE FUNCTION public.get_crop_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
RETURNS TABLE (
  crop_id uuid,
  crop_name text,
  crop_label text,
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
      c.id AS crop_id,
      c.name AS crop_name,
      COALESCE(c.label, c.name) AS crop_label,
      AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score,
      AVG(s.brix_value) AS average_brix,
      COUNT(*) AS submission_count
    FROM submissions s
    JOIN crops c ON s.crop_id = c.id
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    WHERE
      (country_filter IS NULL OR lower(p.country) = lower(country_filter))
      AND (state_filter IS NULL OR lower(p.state) = lower(state_filter))
      AND (city_filter IS NULL OR lower(p.city) = lower(city_filter))
      AND (crop_filter IS NULL OR lower(c.name) = lower(crop_filter))
    GROUP BY c.id, c.name, c.label
  )
  SELECT
    crop_id,
    crop_name,
    crop_label,
    average_normalized_score,
    average_brix,
    submission_count,
    CASE
      WHEN average_normalized_score >= 1.75 THEN 'Excellent'
      WHEN average_normalized_score >= 1.5 THEN 'Good'
      WHEN average_normalized_score >= 1.25 THEN 'Poor'
      ELSE 'Needs Improvement'
    END AS grade,
    RANK() OVER (ORDER BY average_normalized_score DESC) AS rank
  FROM base;
$$;

-- =====================
-- LOCATION LEADERBOARD - Aggregate by location (place -> location)
-- =====================
CREATE FUNCTION public.get_location_leaderboard(
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
      p.id AS location_id,
      COALESCE(l.name, p.label, concat_ws(', ', p.city, p.state, p.country)) AS location_name,
      COALESCE(l.label, NULL) AS location_label,
      p.city,
      p.state,
      p.country,
      AVG(get_normalized_brix_1_to_2(s.crop_id, s.brix_value)) AS average_normalized_score,
      AVG(s.brix_value) AS average_brix,
      COUNT(*) AS submission_count
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE
      (country_filter IS NULL OR lower(p.country) = lower(country_filter))
      AND (state_filter IS NULL OR lower(p.state) = lower(state_filter))
      AND (city_filter IS NULL OR lower(p.city) = lower(city_filter))
      AND (crop_filter IS NULL OR lower(c.name) = lower(crop_filter))
    GROUP BY p.id, l.name, l.label, p.label, p.city, p.state, p.country
  )
  SELECT
    location_id,
    location_name,
    location_label,
    city,
    state,
    country,
    average_normalized_score,
    average_brix,
    submission_count,
    CASE
      WHEN average_normalized_score >= 1.75 THEN 'Excellent'
      WHEN average_normalized_score >= 1.5 THEN 'Good'
      WHEN average_normalized_score >= 1.25 THEN 'Poor'
      ELSE 'Needs Improvement'
    END AS grade,
    RANK() OVER (ORDER BY average_normalized_score DESC) AS rank
  FROM base;
$$;

-- =====================
-- SUBMISSION COUNT LEADERBOARD - Most submissions by entity (brand / crop / location)
-- =====================
CREATE FUNCTION public.get_submission_count_leaderboard(
  country_filter text default null,
  state_filter text default null,
  city_filter text default null,
  crop_filter text default null
)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  entity_name text,
  submission_count bigint,
  rank integer
)
LANGUAGE sql
AS $$
  WITH all_entities AS (
    -- Brands
    SELECT 'brand' AS entity_type, b.id AS entity_id, COALESCE(b.label, b.name) AS entity_name, COUNT(*) AS submission_count
    FROM submissions s
    JOIN brands b ON s.brand_id = b.id
    JOIN places p ON s.place_id = p.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE
      (country_filter IS NULL OR lower(p.country) = lower(country_filter))
      AND (state_filter IS NULL OR lower(p.state) = lower(state_filter))
      AND (city_filter IS NULL OR lower(p.city) = lower(city_filter))
      AND (crop_filter IS NULL OR lower(c.name) = lower(crop_filter))
    GROUP BY b.id, b.name, b.label

    UNION ALL

    -- Crops
    SELECT 'crop' AS entity_type, c.id AS entity_id, COALESCE(c.label, c.name) AS entity_name, COUNT(*) AS submission_count
    FROM submissions s
    JOIN crops c ON s.crop_id = c.id
    JOIN places p ON s.place_id = p.id
    WHERE
      (country_filter IS NULL OR lower(p.country) = lower(country_filter))
      AND (state_filter IS NULL OR lower(p.state) = lower(state_filter))
      AND (city_filter IS NULL OR lower(p.city) = lower(city_filter))
      AND (crop_filter IS NULL OR lower(c.name) = lower(crop_filter))
    GROUP BY c.id, c.name, c.label

    UNION ALL

    -- Locations (place-level)
    SELECT 'location' AS entity_type, p.id AS entity_id,
           COALESCE(l.label, COALESCE(l.name, p.label, concat_ws(', ', p.city, p.state, p.country))) AS entity_name,
           COUNT(*) AS submission_count
    FROM submissions s
    JOIN places p ON s.place_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE
      (country_filter IS NULL OR lower(p.country) = lower(country_filter))
      AND (state_filter IS NULL OR lower(p.state) = lower(state_filter))
      AND (city_filter IS NULL OR lower(p.city) = lower(city_filter))
      AND (crop_filter IS NULL OR lower(c.name) = lower(crop_filter))
    GROUP BY p.id, l.name, l.label, p.label, p.city, p.state, p.country
  )
  SELECT
    entity_type,
    entity_id,
    entity_name,
    submission_count,
    RANK() OVER (ORDER BY submission_count DESC) AS rank
  FROM all_entities;
$$;

-- =====================
-- USER LEADERBOARD - Most active users by submission count (returns display name/email)
-- =====================
CREATE FUNCTION public.get_user_leaderboard(
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
      u.id AS user_id,
      COALESCE(u.display_name, u.email, 'Anonymous User') AS user_name,
      COUNT(s.id) AS submission_count
    FROM users u
    JOIN submissions s ON u.id = s.user_id
    JOIN places p ON s.place_id = p.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE
      (country_filter IS NULL OR lower(p.country) = lower(country_filter))
      AND (state_filter IS NULL OR lower(p.state) = lower(state_filter))
      AND (city_filter IS NULL OR lower(p.city) = lower(city_filter))
      AND (crop_filter IS NULL OR lower(c.name) = lower(crop_filter))
    GROUP BY u.id, u.display_name, u.email
    HAVING COUNT(s.id) > 0
  )
  SELECT
    user_id,
    user_name,
    submission_count,
    RANK() OVER (ORDER BY submission_count DESC) AS rank
  FROM user_submissions;
$$;
