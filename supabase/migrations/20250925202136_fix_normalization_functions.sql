-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS public.get_brand_leaderboard(jsonb);
DROP FUNCTION IF EXISTS public.get_crop_leaderboard(jsonb);
DROP FUNCTION IF EXISTS public.get_location_leaderboard(jsonb);  
DROP FUNCTION IF EXISTS public.get_user_leaderboard(text, text, text, text);

-- Create get_brand_leaderboard with standardized grades and sorting
CREATE OR REPLACE FUNCTION public.get_brand_leaderboard(filters jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(
  brand_id uuid,
  brand_name text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_submissions AS (
    SELECT
      s.*,
      get_normalized_brix_1_to_2(s.crop_id, s.brix_value) AS normalized_score
    FROM submissions s
    JOIN crops c ON c.id = s.crop_id
    JOIN places p ON p.id = s.place_id
    LEFT JOIN locations l ON l.id = p.location_id
    WHERE s.verified = TRUE
      AND (filters->>'state' IS NULL OR LOWER(p.state) = LOWER(filters->>'state'))
      AND (filters->>'country' IS NULL OR LOWER(p.country) = LOWER(filters->>'country'))
      AND (filters->>'crop_category' IS NULL OR LOWER(c.category::text) = LOWER(filters->>'crop_category'))
      AND (filters->>'place_id' IS NULL OR p.id::text = filters->>'place_id')
      AND (filters->>'location_name' IS NULL OR LOWER(l.name) = LOWER(filters->>'location_name'))
  ),
  brand_scores AS (
    SELECT
      b.id AS brand_id,
      b.name AS brand_name,
      AVG(fs.normalized_score) AS avg_score_temp,
      COUNT(*)::integer AS submission_count
    FROM filtered_submissions fs
    JOIN brands b ON fs.brand_id = b.id
    GROUP BY b.id, b.name
  ),
  with_grades AS (
    SELECT
      *,
      CASE
        WHEN avg_score_temp >= 1.8 THEN 'excellent'
        WHEN avg_score_temp >= 1.6 THEN 'good'
        WHEN avg_score_temp >= 1.4 THEN 'average'
        WHEN avg_score_temp >= 1.25 THEN 'poor'
        ELSE 'very poor'
      END AS grade
    FROM brand_scores
  ),
  ranked AS (
    SELECT
      wg.*,
      RANK() OVER (ORDER BY wg.avg_score_temp DESC, 
        CASE 
          WHEN wg.avg_score_temp >= 1.8 THEN 5
          WHEN wg.avg_score_temp >= 1.6 THEN 4
          WHEN wg.avg_score_temp >= 1.4 THEN 3
          WHEN wg.avg_score_temp >= 1.25 THEN 2
          ELSE 1
        END DESC)::integer AS rank
    FROM with_grades wg
  )
  SELECT
    ranked.brand_id,
    ranked.brand_name,
    ranked.avg_score_temp AS avg_normalized_score,
    ranked.grade,
    ranked.submission_count,
    ranked.rank
  FROM ranked;
END;
$function$;

-- Create get_crop_leaderboard with standardized grades and sorting
CREATE OR REPLACE FUNCTION public.get_crop_leaderboard(filters jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(
  crop_id uuid,
  crop_name text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_submissions AS (
    SELECT
      s.*,
      get_normalized_brix_1_to_2(s.crop_id, s.brix_value) AS normalized_score
    FROM submissions s
    JOIN crops c ON c.id = s.crop_id
    JOIN places p ON p.id = s.place_id
    LEFT JOIN locations l ON l.id = p.location_id
    WHERE s.verified = TRUE
      AND (filters->>'state' IS NULL OR LOWER(p.state) = LOWER(filters->>'state'))
      AND (filters->>'country' IS NULL OR LOWER(p.country) = LOWER(filters->>'country'))
      AND (filters->>'crop_category' IS NULL OR LOWER(c.category::text) = LOWER(filters->>'crop_category'))
      AND (filters->>'place_id' IS NULL OR p.id::text = filters->>'place_id')
      AND (filters->>'location_name' IS NULL OR LOWER(l.name) = LOWER(filters->>'location_name'))
  ),
  crop_scores AS (
    SELECT
      c.id AS crop_id,
      c.name AS crop_name,
      AVG(fs.normalized_score) AS avg_score_temp,
      COUNT(*)::integer AS submission_count
    FROM filtered_submissions fs
    JOIN crops c ON fs.crop_id = c.id
    GROUP BY c.id, c.name
  ),
  with_grades AS (
    SELECT
      *,
      CASE
        WHEN avg_score_temp >= 1.8 THEN 'excellent'
        WHEN avg_score_temp >= 1.6 THEN 'good'
        WHEN avg_score_temp >= 1.4 THEN 'average'
        WHEN avg_score_temp >= 1.25 THEN 'poor'
        ELSE 'very poor'
      END AS grade
    FROM crop_scores
  ),
  ranked AS (
    SELECT
      wg.*,
      RANK() OVER (ORDER BY wg.avg_score_temp DESC,
        CASE 
          WHEN wg.avg_score_temp >= 1.8 THEN 5
          WHEN wg.avg_score_temp >= 1.6 THEN 4
          WHEN wg.avg_score_temp >= 1.4 THEN 3
          WHEN wg.avg_score_temp >= 1.25 THEN 2
          ELSE 1
        END DESC)::integer AS rank
    FROM with_grades wg
  )
  SELECT
    ranked.crop_id,
    ranked.crop_name,
    ranked.avg_score_temp AS avg_normalized_score,
    ranked.grade,
    ranked.submission_count,
    ranked.rank
  FROM ranked;
END;
$function$;

-- Create get_location_leaderboard with standardized grades and sorting
CREATE OR REPLACE FUNCTION public.get_location_leaderboard(filters jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(
  location_id uuid,
  location_name text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_submissions AS (
    SELECT
      s.*,
      get_normalized_brix_1_to_2(s.crop_id, s.brix_value) AS normalized_score
    FROM submissions s
    JOIN crops c ON c.id = s.crop_id
    JOIN places p ON p.id = s.place_id
    JOIN locations l ON l.id = p.location_id
    WHERE s.verified = TRUE
      AND (filters->>'state' IS NULL OR LOWER(p.state) = LOWER(filters->>'state'))
      AND (filters->>'country' IS NULL OR LOWER(p.country) = LOWER(filters->>'country'))
      AND (filters->>'crop_category' IS NULL OR LOWER(c.category::text) = LOWER(filters->>'crop_category'))
      AND (filters->>'place_id' IS NULL OR p.id::text = filters->>'place_id')
      AND (filters->>'location_name' IS NULL OR LOWER(l.name) = LOWER(filters->>'location_name'))
  ),
  location_scores AS (
    SELECT
      l.id AS location_id,
      l.name AS location_name,
      AVG(fs.normalized_score) AS avg_score_temp,
      COUNT(*)::integer AS submission_count
    FROM filtered_submissions fs
    JOIN places p ON fs.place_id = p.id
    JOIN locations l ON p.location_id = l.id
    GROUP BY l.id, l.name
  ),
  with_grades AS (
    SELECT
      *,
      CASE
        WHEN avg_score_temp >= 1.8 THEN 'excellent'
        WHEN avg_score_temp >= 1.6 THEN 'good'
        WHEN avg_score_temp >= 1.4 THEN 'average'
        WHEN avg_score_temp >= 1.25 THEN 'poor'
        ELSE 'very poor'
      END AS grade
    FROM location_scores
  ),
  ranked AS (
    SELECT
      wg.*,
      RANK() OVER (ORDER BY wg.avg_score_temp DESC,
        CASE 
          WHEN wg.avg_score_temp >= 1.8 THEN 5
          WHEN wg.avg_score_temp >= 1.6 THEN 4
          WHEN wg.avg_score_temp >= 1.4 THEN 3
          WHEN wg.avg_score_temp >= 1.25 THEN 2
          ELSE 1
        END DESC)::integer AS rank
    FROM with_grades wg
  )
  SELECT
    ranked.location_id,
    ranked.location_name,
    ranked.avg_score_temp AS avg_normalized_score,
    ranked.grade,
    ranked.submission_count,
    ranked.rank
  FROM ranked;
END;
$function$;

-- Create get_user_leaderboard for "Most Submissions" with global capability
CREATE OR REPLACE FUNCTION public.get_user_leaderboard(
  country_filter text DEFAULT NULL::text,
  state_filter text DEFAULT NULL::text,
  city_filter text DEFAULT NULL::text,
  crop_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  submission_count bigint,
  rank bigint,
  city text,
  state text,
  country text
)
LANGUAGE sql
AS $function$
  WITH user_submissions AS (
    SELECT
      u.id AS user_id,
      COALESCE(u.display_name, u.email, 'Anonymous User') AS user_name,
      COUNT(s.id) AS submission_count,
      -- Get the most common location for this user
      MODE() WITHIN GROUP (ORDER BY p.city) AS city,
      MODE() WITHIN GROUP (ORDER BY p.state) AS state,
      MODE() WITHIN GROUP (ORDER BY p.country) AS country
    FROM users u
    JOIN submissions s ON u.id = s.user_id
    JOIN places p ON s.place_id = p.id
    LEFT JOIN crops c ON s.crop_id = c.id
    WHERE
      s.verified = true
      AND (country_filter IS NULL OR lower(p.country) = lower(country_filter))
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
    RANK() OVER (ORDER BY submission_count DESC) AS rank,
    city,
    state,
    country
  FROM user_submissions;
$function$;