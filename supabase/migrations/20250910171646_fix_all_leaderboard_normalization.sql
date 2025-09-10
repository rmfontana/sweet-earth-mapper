--
-- Flexible function for debugging normalization logic
--
DROP FUNCTION IF EXISTS get_brand_leaderboard_v2(jsonb);

CREATE FUNCTION get_brand_leaderboard_v2(filters jsonb DEFAULT '{}')
RETURNS TABLE (
  brand_id uuid,
  brand_name text,
  avg_normalized_score numeric,
  grade text,
  submission_count integer,
  rank integer
) AS $$
DECLARE
  -- Variables to hold the min/max brix values for normalization
  min_brix_val numeric := COALESCE(NULLIF((filters->>'min_brix')::numeric, 0), 0);
  max_brix_val numeric := COALESCE(NULLIF((filters->>'max_brix')::numeric, 0), 100);
  normalization_range numeric := NULLIF(max_brix_val - min_brix_val, 0);
BEGIN
  RETURN QUERY
  WITH filtered_submissions AS (
    SELECT
      s.*,
      c.poor_brix,
      c.excellent_brix,
      -- Use the provided filter values for normalization if they exist
      GREATEST(
        1.0,
        1 + (s.brix_value - min_brix_val) /
          normalization_range
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
