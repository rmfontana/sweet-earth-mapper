-- Drop old functions
DROP FUNCTION IF EXISTS get_location_leaderboard(jsonb);


-- Create updated get_location_leaderboard function
CREATE OR REPLACE FUNCTION get_location_leaderboard(filters jsonb DEFAULT '{}')
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
      c.average_brix,
      c.good_brix,
      c.excellent_brix,
      greatest(1.0, 1 + (s.brix_value - coalesce(c.poor_brix, 0)) / NULLIF((coalesce(c.excellent_brix, 2) - coalesce(c.poor_brix, 0)), 0)) AS normalized_score
    FROM submissions s
    JOIN crops c ON c.id = s.crop_id
    JOIN places p ON p.id = s.place_id
    JOIN locations l ON l.id = p.location_id
    WHERE s.verified = TRUE
      AND (filters->>'state' IS NULL OR lower(p.state) = lower(filters->>'state'))
      AND (filters->>'country' IS NULL OR lower(p.normalized_address) ILIKE '%' || lower(filters->>'country') || '%')
      AND (filters->>'crop_category' IS NULL OR lower(c.category::text) = lower(filters->>'crop_category'))
  ),
  location_scores AS (
    SELECT
      l.id AS location_id,
      l.name AS location_name,
      AVG(fs.normalized_score) AS avg_normalized_score,
      COUNT(*) AS submission_count
    FROM filtered_submissions fs
    JOIN places p ON fs.place_id = p.id
    JOIN locations l ON p.location_id = l.id
    GROUP BY l.id, l.name
  ),
  with_grades AS (
    SELECT *,
      CASE
        WHEN avg_normalized_score >= 1.8 THEN 'excellent'
        WHEN avg_normalized_score >= 1.6 THEN 'good'
        WHEN avg_normalized_score >= 1.4 THEN 'average'
        WHEN avg_normalized_score >= 1.25 THEN 'poor'
        ELSE 'very poor'
      END AS grade
    FROM location_scores
  ),
  ranked AS (
    SELECT *,
      RANK() OVER (ORDER BY avg_normalized_score DESC, grade DESC) AS rank
    FROM with_grades
  )
  SELECT * FROM ranked;
END;
$$ LANGUAGE plpgsql;