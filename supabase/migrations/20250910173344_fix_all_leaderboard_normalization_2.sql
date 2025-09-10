--
-- Migration to revert leaderboard functions to their original versions
--
-- Drop the existing V2 functions to ensure a clean slate and prevent dangling functions
DROP FUNCTION IF EXISTS get_brand_leaderboard_v2(jsonb);
DROP FUNCTION IF EXISTS get_crop_leaderboard_v2(jsonb);
DROP FUNCTION IF EXISTS get_location_leaderboard_v2(jsonb);

-- Drop the original functions in case they exist from a previous state
DROP FUNCTION IF EXISTS get_brand_leaderboard(jsonb);
DROP FUNCTION IF EXISTS get_crop_leaderboard(jsonb);
DROP FUNCTION IF EXISTS get_location_leaderboard(jsonb);

--
-- Final corrected get_brand_leaderboard function
--
CREATE FUNCTION get_brand_leaderboard(filters jsonb DEFAULT '{}')
RETURNS TABLE (
  brand_id uuid,
  brand_name text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_submissions AS (
    SELECT
      s.*,
      c.poor_brix,
      c.excellent_brix,
      GREATEST(
        1.0,
        1 + (s.brix_value - COALESCE(c.poor_brix, 0)) /
          NULLIF((COALESCE(c.excellent_brix, 2) - COALESCE(c.poor_brix, 0)), 0)
      ) AS normalized_score
    FROM submissions s
    JOIN crops c ON c.id = s.crop_id
    JOIN places p ON p.id = s.place_id
    WHERE s.verified = TRUE
      AND (filters->>'state' IS NULL OR LOWER(p.state) = LOWER(filters->>'state'))
      AND (filters->>'country' IS NULL OR LOWER(p.normalized_address) ILIKE '%' || LOWER(filters->>'country') || '%')
      AND (filters->>'crop_category' IS NULL OR LOWER(c.category::text) = LOWER(filters->>'crop_category'))
  ),
  brand_scores AS (
    SELECT
      b.id AS brand_id,
      b.name AS brand_name,
      AVG(fs.normalized_score) AS avg_score_temp,
      -- Explicitly cast COUNT(*) to integer
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
      -- Explicitly cast RANK() to integer
      RANK() OVER (ORDER BY wg.avg_score_temp DESC, wg.grade DESC)::integer AS rank
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
$$ LANGUAGE plpgsql;

--
-- Final corrected get_crop_leaderboard function
--
CREATE FUNCTION get_crop_leaderboard(filters jsonb DEFAULT '{}')
RETURNS TABLE (
  crop_id uuid,
  crop_name text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_submissions AS (
    SELECT
      s.*,
      c.poor_brix,
      c.excellent_brix,
      GREATEST(
        1.0,
        1 + (s.brix_value - COALESCE(c.poor_brix, 0)) /
          NULLIF((COALESCE(c.excellent_brix, 2) - COALESCE(c.poor_brix, 0)), 0)
      ) AS normalized_score
    FROM submissions s
    JOIN crops c ON c.id = s.crop_id
    JOIN places p ON p.id = s.place_id
    WHERE s.verified = TRUE
      AND (filters->>'state' IS NULL OR LOWER(p.state) = LOWER(filters->>'state'))
      AND (filters->>'country' IS NULL OR LOWER(p.normalized_address) ILIKE '%' || LOWER(filters->>'country') || '%')
      AND (filters->>'crop_category' IS NULL OR LOWER(c.category::text) = LOWER(filters->>'crop_category'))
  ),
  crop_scores AS (
    SELECT
      c.id AS crop_id,
      c.name AS crop_name,
      AVG(fs.normalized_score) AS avg_score_temp,
      -- Explicitly cast COUNT(*) to integer
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
      -- Explicitly cast RANK() to integer
      RANK() OVER (ORDER BY wg.avg_score_temp DESC, wg.grade DESC)::integer AS rank
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
$$ LANGUAGE plpgsql;

--
-- Final corrected get_location_leaderboard function
--
CREATE FUNCTION get_location_leaderboard(filters jsonb DEFAULT '{}')
RETURNS TABLE (
  location_id uuid,
  location_name text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_submissions AS (
    SELECT
      s.*,
      c.poor_brix,
      c.excellent_brix,
      GREATEST(
        1.0,
        1 + (s.brix_value - COALESCE(c.poor_brix, 0)) /
          NULLIF((COALESCE(c.excellent_brix, 2) - COALESCE(c.poor_brix, 0)), 0)
      ) AS normalized_score
    FROM submissions s
    JOIN crops c ON c.id = s.crop_id
    JOIN places p ON p.id = s.place_id
    JOIN locations l ON l.id = p.location_id
    WHERE s.verified = TRUE
      AND (filters->>'state' IS NULL OR LOWER(p.state) = LOWER(filters->>'state'))
      AND (filters->>'country' IS NULL OR LOWER(p.normalized_address) ILIKE '%' || LOWER(filters->>'country') || '%')
      AND (filters->>'crop_category' IS NULL OR LOWER(c.category::text) = LOWER(filters->>'crop_category'))
  ),
  location_scores AS (
    SELECT
      l.id AS location_id,
      l.name AS location_name,
      AVG(fs.normalized_score) AS avg_score_temp,
      -- Explicitly cast COUNT(*) to integer
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
      -- Explicitly cast RANK() to integer
      RANK() OVER (ORDER BY wg.avg_score_temp DESC, wg.grade DESC)::integer AS rank
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
$$ LANGUAGE plpgsql;
